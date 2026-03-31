import { timeAgo } from "../utils";

export default function StatusBar({ data, lastUpdate }) {
  const processing = data.filter((v) => v.status === "processing").length;
  return (
    <div
      style={{
        display: "flex",
        gap: "20px",
        alignItems: "center",
        padding: "8px 16px",
        background: "#080c15",
        borderTop: "1px solid #111828",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "10px",
        color: "#3d4d6b",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#34D399",
            boxShadow: "0 0 6px #34D39960",
            animation: "pulse 3s infinite",
          }}
        />
        CONNECTED
      </span>
      <span>{data.length} visualizations</span>
      {processing > 0 && (
        <span style={{ color: "#F59E0B" }}>{processing} processing</span>
      )}
      <span style={{ marginLeft: "auto" }}>
        Updated {timeAgo(lastUpdate)}
      </span>
      <span>Polling: 15s</span>
    </div>
  );
}
