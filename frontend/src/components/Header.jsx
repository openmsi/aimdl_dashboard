import ViewModeSelector from "./ViewModeSelector";

export default function Header({ viewMode, setViewMode }) {
  return (
    <div
      style={{
        padding: "16px 24px",
        borderBottom: "1px solid #111828",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#0a0e18",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "18px",
              fontWeight: 600,
              color: "#e2e8f4",
              letterSpacing: "-0.02em",
            }}
          >
            AIMD-L
            <span style={{ color: "#4ECDC4", marginLeft: "6px" }}>Live</span>
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              color: "#3d4d6b",
              marginTop: "2px",
            }}
          >
            Autonomous Instrumented Materials Discovery Laboratory
          </div>
        </div>
      </div>
      <ViewModeSelector mode={viewMode} setMode={setViewMode} />
    </div>
  );
}
