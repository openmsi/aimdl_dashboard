import { useState } from "react";
import { INSTRUMENTS, INSTRUMENT_COLORS, INSTRUMENT_DESCRIPTIONS } from "../config";
import VizCard from "./VizCard";

export default function SampleComparisonView({ data }) {
  const samples = [...new Set(data.map((v) => v.sample))].sort();
  const [selectedSample, setSelectedSample] = useState(samples[0] || "A1");

  const sampleData = data.filter((v) => v.sample === selectedSample);
  const byInstrument = {};
  INSTRUMENTS.forEach((inst) => {
    byInstrument[inst.id] = sampleData
      .filter((v) => v.instrument === inst.id)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        {samples.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSample(s)}
            style={{
              padding: "6px 14px",
              border:
                selectedSample === s
                  ? "1px solid #FFE66D60"
                  : "1px solid #1e2740",
              borderRadius: "5px",
              background: selectedSample === s ? "#FFE66D10" : "#0d1220",
              color: selectedSample === s ? "#FFE66D" : "#4a5672",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "12px",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {s}
          </button>
        ))}
      </div>
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
                    No data for {selectedSample}
                  </div>
                ) : (
                  items
                    .slice(0, 3)
                    .map((viz) => <VizCard key={viz.id} viz={viz} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
