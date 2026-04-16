import { useState, useMemo, useEffect } from "react";
import { INSTRUMENTS, INSTRUMENT_COLORS, INSTRUMENT_DESCRIPTIONS } from "../config";
import { parseIgsn } from "../utils";
import VizCard from "./VizCard";

export default function SampleComparisonView({ data }) {
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [selectedSuffix, setSelectedSuffix] = useState("ALL");
  const [sortMode, setSortMode] = useState("suffix");

  const batches = useMemo(() => {
    const bases = new Set();
    data.forEach((v) => {
      const b = parseIgsn(v.sample || v.igsn).base;
      if (b) bases.add(b);
    });
    return [...bases].sort();
  }, [data]);

  useEffect(() => {
    if (batches.length > 0 && (!selectedBatch || !batches.includes(selectedBatch))) {
      setSelectedBatch(batches[0]);
      setSelectedSuffix("ALL");
    }
  }, [batches, selectedBatch]);

  const suffixesForBatch = useMemo(() => {
    if (!selectedBatch) return [];
    const suffixes = new Set();
    data.forEach((v) => {
      const parsed = parseIgsn(v.sample || v.igsn);
      if (parsed.base === selectedBatch) {
        suffixes.add(parsed.suffix);
      }
    });
    return [...suffixes].sort((a, b) => {
      if (a === null) return -1;
      if (b === null) return 1;
      return a.localeCompare(b);
    });
  }, [data, selectedBatch]);

  const filteredData = useMemo(() => {
    if (!selectedBatch) return [];
    return data.filter((v) => {
      const parsed = parseIgsn(v.sample || v.igsn);
      if (parsed.base !== selectedBatch) return false;
      if (selectedSuffix === "ALL") return true;
      return parsed.suffix === selectedSuffix;
    });
  }, [data, selectedBatch, selectedSuffix]);

  const byInstrument = useMemo(() => {
    const grouped = {};
    INSTRUMENTS.forEach((inst) => {
      const items = filteredData.filter((v) => v.instrument === inst.id);
      if (sortMode === "suffix") {
        items.sort((a, b) => {
          const sa = parseIgsn(a.sample || a.igsn).suffix || "";
          const sb = parseIgsn(b.sample || b.igsn).suffix || "";
          const cmp = sa.localeCompare(sb);
          if (cmp !== 0) return cmp;
          return new Date(b.timestamp) - new Date(a.timestamp);
        });
      } else {
        items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      grouped[inst.id] = items;
    });
    return grouped;
  }, [filteredData, sortMode]);

  return (
    <div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
        {batches.map((batch) => (
          <button
            key={batch}
            onClick={() => {
              setSelectedBatch(batch);
              setSelectedSuffix("ALL");
            }}
            style={{
              padding: "6px 14px",
              border: selectedBatch === batch ? "1px solid #FFE66D60" : "1px solid #1e2740",
              borderRadius: "5px",
              background: selectedBatch === batch ? "#FFE66D10" : "#0d1220",
              color: selectedBatch === batch ? "#FFE66D" : "#4a5672",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {batch}
          </button>
        ))}
      </div>

      {selectedBatch && suffixesForBatch.length > 0 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
          {["ALL", ...suffixesForBatch].map((sfx) => {
            const key = sfx === null ? "__base__" : sfx;
            return (
              <button
                key={key}
                onClick={() => setSelectedSuffix(sfx)}
                style={{
                  padding: "4px 10px",
                  border: selectedSuffix === sfx ? "1px solid #4ECDC460" : "1px solid #1e2740",
                  borderRadius: "12px",
                  background: selectedSuffix === sfx ? "#4ECDC410" : "#0d1220",
                  color: selectedSuffix === sfx ? "#4ECDC4" : "#3d4d6b",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              >
                {sfx === "ALL" ? "ALL" : sfx === null ? "base" : sfx}
              </button>
            );
          })}
          <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
            <button
              onClick={() => setSortMode("suffix")}
              style={{
                padding: "3px 8px",
                border: "none",
                borderRadius: "3px",
                background: sortMode === "suffix" ? "#1e274080" : "transparent",
                color: sortMode === "suffix" ? "#c8d3e8" : "#3d4d6b",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "10px",
                cursor: "pointer",
              }}
            >
              by sub-sample
            </button>
            <button
              onClick={() => setSortMode("time")}
              style={{
                padding: "3px 8px",
                border: "none",
                borderRadius: "3px",
                background: sortMode === "time" ? "#1e274080" : "transparent",
                color: sortMode === "time" ? "#c8d3e8" : "#3d4d6b",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "10px",
                cursor: "pointer",
              }}
            >
              by time
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${INSTRUMENTS.length}, 1fr)`,
          gap: "16px",
        }}
      >
        {INSTRUMENTS.map((inst) => {
          const instColor = INSTRUMENT_COLORS[inst.id];
          const items = byInstrument[inst.id] || [];
          return (
            <div key={inst.id}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "12px",
                  paddingBottom: "8px",
                  borderBottom: `1px solid ${instColor}25`,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: instColor,
                    boxShadow: `0 0 8px ${instColor}40`,
                  }}
                />
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "13px",
                    color: instColor,
                    fontWeight: 600,
                  }}
                >
                  {inst.id}
                </span>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "10px",
                    color: "#4a5672",
                  }}
                >
                  {INSTRUMENT_DESCRIPTIONS[inst.id]}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {items.length === 0 ? (
                  <div
                    style={{
                      padding: "30px",
                      textAlign: "center",
                      color: "#2a3550",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "11px",
                      border: "1px dashed #1e2740",
                      borderRadius: "8px",
                    }}
                  >
                    No data for {selectedBatch}
                  </div>
                ) : (
                  items.map((viz) => <VizCard key={viz.id} viz={viz} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
