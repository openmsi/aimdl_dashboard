import { INSTRUMENT_COLORS } from "../config";
import { timeAgo } from "../utils";
import MockVisualization from "./MockVisualization";

export default function VizCard({ viz, spotlight = false, onClick }) {
  const instColor = INSTRUMENT_COLORS[viz.instrument];
  return (
    <div
      onClick={onClick}
      style={{
        background: "#0d1220",
        border: spotlight ? `1px solid ${instColor}40` : "1px solid #151d30",
        borderRadius: "8px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.25s ease",
        boxShadow: spotlight ? `0 0 20px ${instColor}10` : "none",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${instColor}60`;
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = spotlight
          ? `${instColor}40`
          : "#151d30";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {viz.pairRole && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 2,
            background: `${instColor}20`,
            border: `1px solid ${instColor}40`,
            borderRadius: "4px",
            padding: "2px 8px",
            fontSize: "9px",
            fontFamily: "'IBM Plex Mono', monospace",
            color: instColor,
            textTransform: "uppercase",
          }}
        >
          {viz.pairRole}
        </div>
      )}
      {viz.status === "processing" && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 2,
            background: "#F59E0B20",
            border: "1px solid #F59E0B40",
            borderRadius: "4px",
            padding: "2px 8px",
            fontSize: "9px",
            fontFamily: "'IBM Plex Mono', monospace",
            color: "#F59E0B",
            animation: "pulse 2s infinite",
          }}
        >
          PROCESSING
        </div>
      )}
      <div style={{ aspectRatio: spotlight ? "16/9" : "16/10" }}>
        {viz.imageUrl ? (
          <img
            src={viz.imageUrl}
            alt={viz.vizType}
            style={{ width: "100%", height: "100%", objectFit: "contain", background: "#0a0e17" }}
            loading="lazy"
          />
        ) : (
          <MockVisualization viz={viz} large={spotlight} />
        )}
      </div>
      <div style={{ padding: spotlight ? "14px 16px" : "10px 12px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: spotlight ? "13px" : "11px",
              color: "#c8d3e8",
              fontWeight: 500,
            }}
          >
            {viz.vizType}
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              color: "#4a5672",
            }}
          >
            {timeAgo(viz.timestamp)}
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              color: instColor,
              background: `${instColor}12`,
              padding: "2px 6px",
              borderRadius: "3px",
            }}
          >
            {viz.instrument}
          </span>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              color: "#6b7a99",
            }}
          >
            Sample {viz.sample}
          </span>
        </div>
      </div>
    </div>
  );
}
