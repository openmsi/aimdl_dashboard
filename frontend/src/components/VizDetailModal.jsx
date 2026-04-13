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
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {viz.imageUrl ? (
          <img
            src={viz.imageUrl}
            alt={viz.vizType}
            style={{
              width: "100%",
              maxHeight: "55vh",
              objectFit: "contain",
              background: "#0a0e17",
              display: "block",
            }}
          />
        ) : (
          <MockVisualization viz={viz} large />
        )}
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
              ["IGSN", viz.igsn || viz.sample],
              ["Timestamp", new Date(viz.timestamp).toLocaleString()],
              ["Status", viz.status],
              ["Item ID", `item/${viz.id}`],
              ...(viz.folderPath ? [["Folder", viz.folderPath]] : []),
            ].map(([label, value]) => (
              <div key={label}>
                <div style={{ color: "#3d4d6b", marginBottom: "2px" }}>
                  {label}
                </div>
                <div style={{ color: "#8892a8" }}>{value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: "16px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {viz.id && (
              <a
                href={`https://data.htmdec.org/#item/${viz.id}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "8px 16px",
                  background: "#4ECDC415",
                  border: "1px solid #4ECDC440",
                  borderRadius: "6px",
                  color: "#4ECDC4",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Open in Data Portal →
              </a>
            )}
            {viz.igsn && (
              <a
                href={`https://data.htmdec.org/#igsn/${viz.igsn}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "8px 16px",
                  background: "#A78BFA15",
                  border: "1px solid #A78BFA40",
                  borderRadius: "6px",
                  color: "#A78BFA",
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px",
                  cursor: "pointer",
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                View Sample →
              </a>
            )}
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
