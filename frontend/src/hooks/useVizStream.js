import { useState, useEffect, useRef, useCallback } from "react";
import { INSTRUMENTS, INSTRUMENT_COLORS, SAMPLE_POSITIONS, VIZ_TYPES, API_CONFIG } from "../config";

const INSTRUMENT_IDS = INSTRUMENTS.map((i) => i.id);

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
  return {
    id: viz.id,
    instrument: viz.instrument,
    sample: viz.igsn,
    vizType: viz.name,
    vizColor: INSTRUMENT_COLORS[viz.instrument] || "#888",
    timestamp: viz.created,
    imageUrl: `${API_CONFIG.baseUrl}/visualizations/${viz.id}/image`,
    folderPath: viz.folder_path,
    igsn: viz.igsn,
    fileId: viz.file_id,
    metadata: viz.metadata,
    pairKey: viz.pair_key || null,
    pairRole: viz.pair_role || null,
    position: viz.position || null,
    status: "complete",
  };
}

export default function useVizStream({ filter = "ALL", pollIntervalMs, limit = 60 } = {}) {
  const interval = pollIntervalMs || API_CONFIG.pollIntervalMs;
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
      const url = new URL(`${API_CONFIG.baseUrl}/visualizations`);
      url.searchParams.set("limit", String(limit));
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const mapped = json.items.map(mapApiViz);
      setData(mapped);
      setLastUpdate(new Date().toISOString());
      setUseMock(false);
      return true;
    } catch {
      return false;
    }
  }, [forceMock, limit]);

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
