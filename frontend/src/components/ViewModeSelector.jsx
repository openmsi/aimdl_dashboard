export default function ViewModeSelector({ mode, setMode }) {
  const modes = [
    { key: "stream", label: "Live Stream", icon: "◉" },
    { key: "spotlight", label: "Spotlight", icon: "◎" },
    { key: "sample", label: "By Sample", icon: "⊞" },
    { key: "movie", label: "Movie", icon: "▶" },
  ];
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {modes.map((m) => (
        <button
          key={m.key}
          onClick={() => setMode(m.key)}
          style={{
            padding: "6px 14px",
            border:
              mode === m.key ? "1px solid #4ECDC440" : "1px solid #1e2740",
            borderRadius: "5px",
            background: mode === m.key ? "#4ECDC410" : "transparent",
            color: mode === m.key ? "#4ECDC4" : "#4a5672",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "11px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <span style={{ marginRight: "6px" }}>{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
