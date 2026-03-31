import { INSTRUMENT_COLORS, INSTRUMENT_DESCRIPTIONS } from "../config";
import MockVisualization from "./MockVisualization";

export default function VizDetailModal({ viz, onClose }) {
  const instColor = INSTRUMENT_COLORS[viz.instrument];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#080c15e0",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        animation: "slideIn 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#0d1220",
          border: `1px solid ${instColor}30`,
          borderRadius: "12px",
          width: "min(800px, 90vw)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <MockVisualization viz={viz} large />
        <div style={{ padding: "20px" }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "18px",
              color: "#e2e8f4",
              marginBottom: "12px",
            }}
          >
            {viz.vizType}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
            }}
          >
            {[
              ["Instrument", `${viz.instrument} · ${INSTRUMENT_DESCRIPTIONS[viz.instrument]}`],
              ["Sample Position", viz.sample],
              ["Timestamp", new Date(viz.timestamp).toLocaleString()],
              ["Status", viz.status],
              ["Girder ID", `item/${viz.id}`],
              ["Pipeline", "helix_metadata_extraction"],
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ color: "#3d4d6b", marginBottom: "2px" }}>
                  {label}
                </div>
                <div style={{ color: "#8892a8" }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
            <button
              style={{
                padding: "8px 16px",
                background: "#4ECDC415",
                border: "1px solid #4ECDC440",
                borderRadius: "6px",
                color: "#4ECDC4",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              Open in Girder →
            </button>
            <button
              style={{
                padding: "8px 16px",
                background: "transparent",
                border: "1px solid #1e2740",
                borderRadius: "6px",
                color: "#6b7a99",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "11px",
                cursor: "pointer",
              }}
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
