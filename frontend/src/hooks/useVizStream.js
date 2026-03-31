import { useState, useEffect, useRef } from "react";
import { INSTRUMENTS, SAMPLE_POSITIONS, VIZ_TYPES } from "../config";

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
    id,
    instrument,
    sample,
    vizType: vizType.name,
    vizColor: vizType.color,
    timestamp: now.toISOString(),
    girderUrl: `https://girder.example.com/item/${id}/download`,
    status: Math.random() > 0.1 ? "complete" : "processing",
  };
}

export default function useVizStream({ filter = "ALL", pollIntervalMs = 8000 } = {}) {
  const [data, setData] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date().toISOString());
  const idCounter = useRef(100);

  useEffect(() => {
    const initial = [];
    for (let i = 0; i < 24; i++) {
      initial.push(generateMockViz(i));
    }
    initial.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    setData(initial);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => {
        const newViz = generateMockViz(idCounter.current++);
        newViz.timestamp = new Date().toISOString();
        return [newViz, ...prev].slice(0, 60);
      });
      setLastUpdate(new Date().toISOString());
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [pollIntervalMs]);

  const filtered =
    filter === "ALL" ? data : data.filter((v) => v.instrument === filter);

  const counts = { ALL: data.length };
  INSTRUMENT_IDS.forEach(
    (inst) => (counts[inst] = data.filter((v) => v.instrument === inst).length)
  );

  return { data, filtered, counts, lastUpdate };
}
