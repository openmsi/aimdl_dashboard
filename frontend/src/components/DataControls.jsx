import { useCallback, useEffect, useState } from "react";
import { INSTRUMENTS, INSTRUMENT_COLORS, API_CONFIG } from "../config";

const LIMIT_OPTIONS = [30, 60, 120, 250, 500];

function formatNumber(n) {
  if (n == null) return "0";
  return Number(n).toLocaleString("en-US");
}

function secondsAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  return Math.max(0, Math.floor((Date.now() - then) / 1000));
}

export default function DataControls({ limit, setLimit, lastUpdate, onRefresh }) {
  const [counts, setCounts] = useState(null);
  const [tick, setTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_CONFIG.baseUrl}/counts`);
      if (!res.ok) return;
      const json = await res.json();
      setCounts(json);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadCounts();
    const t = setInterval(loadCounts, 30000);
    return () => clearInterval(t);
  }, [loadCounts]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      try {
        await fetch(`${API_CONFIG.baseUrl}/refresh`, { method: "POST" });
      } catch {
        // ignore network errors
      }
      if (onRefresh) await onRefresh();
      loadCounts();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing, loadCounts]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "r" || e.key === "R") {
        const target = e.target;
        const tag = target && target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        handleRefresh();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRefresh]);

  const ago = secondsAgo(lastUpdate);
  void tick;

  const buttonStyle = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "16px",
    background: "#111828",
    color: "#c8d3e8",
    border: "1px solid #22304d",
    borderRadius: "4px",
    padding: "6px 14px",
    cursor: "pointer",
  };

  const labelStyle = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "14px",
    color: "#6b7a99",
  };

  const countStyle = {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "16px",
    fontWeight: 600,
    color: "#c8d3e8",
  };

  return (
    <div
      style={{
        background: "#080c15",
        borderBottom: "1px solid #111828",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        flexWrap: "wrap",
      }}
    >
      <button type="button" onClick={handleRefresh} style={buttonStyle}>
        Refresh [R]
      </button>

      <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "8px" }}>
        Show
        <select
          value={String(limit)}
          onChange={(e) => setLimit(Number(e.target.value))}
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "14px",
            background: "#111828",
            color: "#c8d3e8",
            border: "1px solid #22304d",
            borderRadius: "4px",
            padding: "4px 8px",
          }}
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={String(n)}>
              {n}
            </option>
          ))}
        </select>
      </label>

      <span style={labelStyle}>
        Last updated: {ago == null ? "—" : `${ago}s ago`}
      </span>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "20px" }}>
        {counts && (
          <span style={{ ...countStyle }}>
            {formatNumber(counts.total_files)}
          </span>
        )}
        {counts && counts.by_instrument &&
          INSTRUMENTS.map((inst) => {
            const c = counts.by_instrument[inst.id];
            if (!c) return null;
            return (
              <span
                key={inst.id}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <span style={{ ...labelStyle, color: INSTRUMENT_COLORS[inst.id] }}>
                  {inst.id}
                </span>
                <span style={countStyle}>{formatNumber(c.files)}</span>
              </span>
            );
          })}
      </div>
    </div>
  );
}
