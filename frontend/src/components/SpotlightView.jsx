import { INSTRUMENT_COLORS, INSTRUMENT_DESCRIPTIONS } from "../config";
import MockVisualization from "./MockVisualization";
import VizCard from "./VizCard";

export default function SpotlightView({ filtered }) {
  const latest = filtered[0];
  if (!latest) return null;

  const instColor = INSTRUMENT_COLORS[latest.instrument];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gap: "20px",
        animation: "slideIn 0.3s ease",
      }}
    >
      <div>
        <div
          style={{
            background: "#0d1220",
            border: `1px solid ${instColor}30`,
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <MockVisualization viz={latest} large />
          <div style={{ padding: "16px 20px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: "16px",
                    color: "#e2e8f4",
                    fontWeight: 500,
                  }}
                >
                  {latest.vizType}
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginTop: "8px",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "11px",
                      color: instColor,
                      background: `${instColor}15`,
                      padding: "3px 8px",
                      borderRadius: "4px",
                    }}
                  >
                    {latest.instrument} · {INSTRUMENT_DESCRIPTIONS[latest.instrument]}
                  </span>
                  <span
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: "11px",
                      color: "#6b7a99",
                    }}
                  >
                    Sample {latest.sample}
                  </span>
                </div>
              </div>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "11px",
                  color: "#4a5672",
                }}
              >
                {new Date(latest.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "11px",
            color: "#4a5672",
            marginBottom: "4px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Recent
        </div>
        {filtered.slice(1, 7).map((viz) => (
          <VizCard key={viz.id} viz={viz} />
        ))}
      </div>
    </div>
  );
}
