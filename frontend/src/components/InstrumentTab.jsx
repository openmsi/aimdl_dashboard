export default function InstrumentTab({ name, active, color, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        border: active ? `1px solid ${color}` : "1px solid #1e2740",
        borderRadius: "6px",
        background: active ? `${color}12` : "#0d1220",
        color: active ? color : "#6b7a99",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        transition: "all 0.2s ease",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: active ? color : "#2a3550",
          boxShadow: active ? `0 0 8px ${color}60` : "none",
          transition: "all 0.3s ease",
        }}
      />
      {name}
      <span
        style={{
          background: active ? `${color}20` : "#151d30",
          padding: "2px 6px",
          borderRadius: "4px",
          fontSize: "10px",
        }}
      >
        {count}
      </span>
    </button>
  );
}
