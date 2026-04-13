import { useEffect, useState } from "react";
import { API_CONFIG, INSTRUMENTS, INSTRUMENT_COLORS } from "../config";

const LIMIT_OPTIONS = [30, 60, 120, 250, 500];

function formatAgo(lastUpdate) {
  if (!lastUpdate) return "—";
  const secs = Math.max(0, Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

const btnBase = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: "16px",
  background: "#0a0e18",
  color: "#c8d3e8",
  border: "1px solid #1c2740",
  padding: "10px 20px",
  cursor: "pointer",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  borderRadius: "4px",
};

export default function DataControls({ limit, setLimit, lastUpdate, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchCounts = async () => {
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/counts`);
      if (!res.ok) return;
      const json = await res.json();
      setCounts(json);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCounts();
    const t = setInterval(fetchCounts, 30000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await fetch(`${API_CONFIG.baseUrl}/refresh`, { method: "POST" });
    } catch {
      // ignore — still try refetch
    }
    try {
      if (onRefresh) await onRefresh();
    } finally {
      fetchCounts();
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "r" && e.key !== "R") return;
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.target && e.target.isContentEditable) return;
      e.preventDefault();
      handleRefresh();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [refreshing]);

  const total = counts?.total_files;
  const byInst = counts?.by_instrument || {};

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "20px",
        padding: "14px 24px",
        borderBottom: "1px solid #111828",
        background: "#080c15",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "16px",
        color: "#6b7a99",
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        style={{
          ...btnBase,
          opacity: refreshing ? 0.5 : 1,
          cursor: refreshing ? "wait" : "pointer",
        }}
        title="Refresh (r)"
      >
        {refreshing ? "Refreshing…" : "Refresh [R]"}
      </button>

      <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ color: "#3d4d6b", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "14px" }}>
          Show
        </span>
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt(e.target.value, 10))}
          style={{
            ...btnBase,
            textTransform: "none",
            padding: "8px 14px",
          }}
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      <div style={{ color: "#3d4d6b", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "14px" }}>
        Last updated: <span style={{ color: "#6b7a99" }}>{formatAgo(lastUpdate)}</span>
      </div>

      <div style={{ marginLeft: "auto", display: "flex", gap: "20px", alignItems: "center" }}>
        {total != null && (
          <span style={{ color: "#3d4d6b", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "16px" }}>
            Total: <span style={{ color: "#c8d3e8", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{total.toLocaleString()}</span>
          </span>
        )}
        {INSTRUMENTS.map((inst) => {
          const n = byInst?.[inst.id]?.files ?? 0;
          return (
            <span key={inst.id} style={{ display: "flex", gap: "8px", fontSize: "16px" }}>
              <span style={{ color: INSTRUMENT_COLORS[inst.id], letterSpacing: "0.05em", fontWeight: 500 }}>
                {inst.id}
              </span>
              <span style={{ color: "#c8d3e8", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                {n.toLocaleString()}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
