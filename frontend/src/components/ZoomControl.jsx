export const ZOOM_LEVELS = [
  { level: 1, label: "XL", minWidth: 500 },
  { level: 2, label: "L",  minWidth: 380 },
  { level: 3, label: "M",  minWidth: 280 },
  { level: 4, label: "S",  minWidth: 200 },
  { level: 5, label: "XS", minWidth: 150 },
];

const buttonStyle = {
  width: "24px",
  height: "24px",
  border: "1px solid #1e2740",
  borderRadius: "4px",
  background: "transparent",
  color: "#6b7a99",
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "13px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s",
};

export default function ZoomControl({ zoom, setZoom }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
      <button
        onClick={() => setZoom(Math.max(1, zoom - 1))}
        style={{
          ...buttonStyle,
          opacity: zoom <= 1 ? 0.3 : 1,
        }}
        disabled={zoom <= 1}
        title="Zoom in (larger cards)"
      >
        -
      </button>
      <div style={{ display: "flex", gap: "3px", alignItems: "center" }}>
        {ZOOM_LEVELS.map((z) => (
          <div
            key={z.level}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: z.level === zoom ? "#4ECDC4" : "#1e2740",
              boxShadow: z.level === zoom ? "0 0 6px #4ECDC440" : "none",
              transition: "all 0.2s",
            }}
          />
        ))}
      </div>
      <button
        onClick={() => setZoom(Math.min(5, zoom + 1))}
        style={{
          ...buttonStyle,
          opacity: zoom >= 5 ? 0.3 : 1,
        }}
        disabled={zoom >= 5}
        title="Zoom out (smaller cards)"
      >
        +
      </button>
      <span
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "9px",
          color: "#3d4d6b",
          marginLeft: "2px",
        }}
      >
        {ZOOM_LEVELS.find((z) => z.level === zoom)?.label}
      </span>
    </div>
  );
}
