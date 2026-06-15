import ViewModeSelector from "./ViewModeSelector";
import ZoomControl from "./ZoomControl";
import { getGirderToken, logoutGirderToken } from "../config";

export default function Header({ viewMode, setViewMode, zoom, setZoom }) {
  const isLoggedIn = Boolean(getGirderToken());

  async function handleLogout() {
    await logoutGirderToken();
    window.location.reload();
  }

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
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {isLoggedIn && (
          <button
            type="button"
            onClick={handleLogout}
            style={{
              border: "1px solid #334155",
              background: "#111827",
              color: "#e2e8f4",
              borderRadius: "999px",
              padding: "8px 12px",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        )}
        <ViewModeSelector mode={viewMode} setMode={setViewMode} />
        <div style={{ width: "1px", height: "20px", background: "#1e2740" }} />
        <ZoomControl zoom={zoom} setZoom={setZoom} />
      </div>
    </div>
  );
}
