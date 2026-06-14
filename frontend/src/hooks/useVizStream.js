import { useState, useEffect, useRef, useCallback } from "react";
import {
  INSTRUMENTS,
  INSTRUMENT_COLORS,
  SAMPLE_POSITIONS,
  VIZ_TYPES,
  GIRDER_DATAFILES_URL,
  girderFetch,
  makeGirderImageUrl,
} from "../config";

const INSTRUMENT_IDS = INSTRUMENTS.map((i) => i.id);

const DATA_TYPE_BY_INSTRUMENT = {
  HELIX: {
    dataType: "pdv_alpss_output",
    qargs: { filters: JSON.stringify({ "meta.alpss_output_name": "figure" }) },
  },
  MAXIMA: {
    dataType: "xrd_derived",
    qargs: { filters: JSON.stringify({ "name": { "$regex": ".png$" } }) },
  },
  SPHINX: { dataType: "xrd_raw" },
};

function instrumentFromDataType(dataType) {
  const entry = Object.entries(DATA_TYPE_BY_INSTRUMENT).find(([, config]) => config.dataType === dataType);
  return entry ? entry[0] : "HELIX";
}

export function generateMockViz(id) {
  const instrument =
    INSTRUMENT_IDS[Math.floor(Math.random() * INSTRUMENT_IDS.length)];
  const sample =
    SAMPLE_POSITIONS[Math.floor(Math.random() * SAMPLE_POSITIONS.length)];
  const vizType = VIZ_TYPES[Math.floor(Math.random() * VIZ_TYPES.length)];
  const now = new Date();
  now.setSeconds(now.getSeconds() - Math.floor(Math.random() * 300));
  return {
    id: String(id),
    instrument,
    sample,
    vizType: vizType.name,
    vizColor: vizType.color,
    timestamp: now.toISOString(),
    imageUrl: null,
    status: Math.random() > 0.1 ? "complete" : "processing",
  };
}

export function mapApiViz(viz) {
  const itemId = viz._id || viz.id;
  const instrument = viz.instrument || instrumentFromDataType(viz.meta?.data_type || viz.data_type);
  const igsn = viz.igsn || viz.sample || viz.meta?.igsn || "";
  const imageUrl = viz.imageUrl || makeGirderImageUrl(itemId);

  return {
    id: itemId,
    instrument,
    sample: igsn,
    vizType: viz.name || viz.meta?.data_type || "Visualization",
    vizColor: INSTRUMENT_COLORS[instrument] || "#888",
    timestamp: viz.created || new Date().toISOString(),
    imageUrl,
    folderPath: viz.folder_path || viz.folderId || null,
    igsn,
    meta: viz.meta || {},
    pairKey: viz.pair_key || null,
    pairRole: viz.pair_role || null,
    position: viz.position || null,
    status: "complete",
  };
}

export default function useVizStream({ filter = "ALL", pollIntervalMs, perInstrument = 30 } = {}) {
  const interval = pollIntervalMs || 15000;
  const [data, setData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date().toISOString());
  const [useMock, setUseMock] = useState(false);
  const idCounter = useRef(100);

  const params = new URLSearchParams(window.location.search);
  const forceMock = params.get("mock") === "true";

  const fetchFromApi = useCallback(async () => {
    if (forceMock) {
      setUseMock(true);
      return false;
    }

    try {
      const requests = Object.entries(DATA_TYPE_BY_INSTRUMENT).map(async ([instrument, config]) => {
        const params = new URLSearchParams({
          dataType: config.dataType,
          limit: String(perInstrument),
          sort: "created",
          sortdir: -1,
          ...(config.qargs || {}),
        });
        const url = `${GIRDER_DATAFILES_URL}?${params.toString()}`;
        const res = await girderFetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const items = Array.isArray(json) ? json : json.items || json.data || [];
        return items
          .filter((item) => (item.name || "").toLowerCase().endsWith(".png"))
          .map((item) => mapApiViz({ ...item, instrument }));
      });

      const mapped = (await Promise.all(requests)).flat().sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setData(mapped);
      setLastUpdate(new Date().toISOString());
      setUseMock(false);
      return true;
    } catch {
      return false;
    }
  }, [forceMock, perInstrument]);

  // Initial load: try API, fall back to mock
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await fetchFromApi();
      if (!cancelled && !ok) {
        setUseMock(true);
        const initial = [];
        for (let i = 0; i < 24; i++) {
          initial.push(generateMockViz(i));
        }
        initial.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setData(initial);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchFromApi]);

  // Polling
  useEffect(() => {
    if (useMock) {
      const timer = setInterval(() => {
        setData((prev) => {
          const newViz = generateMockViz(idCounter.current++);
          newViz.timestamp = new Date().toISOString();
          return [newViz, ...prev].slice(0, 60);
        });
        setLastUpdate(new Date().toISOString());
      }, interval);
      return () => clearInterval(timer);
    } else {
      const timer = setInterval(() => { fetchFromApi(); }, interval);
      return () => clearInterval(timer);
    }
  }, [useMock, interval, fetchFromApi]);

  const filtered =
    filter === "ALL" ? data : data.filter((v) => v.instrument === filter);

  const counts = { ALL: data.length };
  INSTRUMENT_IDS.forEach(
    (inst) => (counts[inst] = data.filter((v) => v.instrument === inst).length)
  );

  return { data, filtered, counts, lastUpdate, useMock, refetch: fetchFromApi };
}
