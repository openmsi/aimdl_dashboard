import { useEffect, useRef, useState } from "react";
import { INSTRUMENTS, INSTRUMENT_COLORS, STREAM_COUNTER_URL } from "../config";

const MOCK_DATA = {
  total_samples: 0,
  total_files: 0,
  total_bytes: 0,
  total_bytes_human: "0 B",
  rates: {
    samples_per_hour: 0,
    files_per_hour: 0,
    bytes_per_hour_human: "0 B",
  },
  instruments: {
    HELIX: { samples: 0, files: 0, bytes: 0 },
    MAXIMA: { samples: 0, files: 0, bytes: 0 },
    SPHINX: { samples: 0, files: 0, bytes: 0 },
  },
};

function formatNumber(n) {
  if (n == null) return "0";
  return n.toLocaleString("en-US");
}

function Counter({ label, value, rate }) {
  return (
    <div style={{ flex: 1, textAlign: "center", padding: "0 16px" }}>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "10px",
          color: "#3d4d6b",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontVariantNumeric: "tabular-nums",
          fontSize: "52px",
          fontWeight: 600,
          color: "#e2e8f4",
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: "11px",
          fontWeight: 300,
          color: "#6b7a99",
          marginTop: "8px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {rate}
      </div>
    </div>
  );
}

function ContributionBars({ data, metric }) {
  const total = INSTRUMENTS.reduce(
    (sum, inst) => sum + (data.instruments?.[inst.id]?.[metric] || 0),
    0,
  );
  return (
    <div style={{ flex: 1, padding: "0 16px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {INSTRUMENTS.map((inst) => {
          const v = data.instruments?.[inst.id]?.[metric] || 0;
          const pct = total > 0 ? (v / total) * 100 : 0;
          const color = INSTRUMENT_COLORS[inst.id];
          const isSphinxEmpty = inst.id === "SPHINX" && (data.instruments?.SPHINX?.files || 0) === 0;
          return (
            <div key={inst.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "10px",
                  color,
                  width: "56px",
                  letterSpacing: "0.05em",
                }}
              >
                {inst.id}
              </div>
              <div
                style={{
                  flex: 1,
                  height: "6px",
                  background: "#111828",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    background: color,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "10px",
                  color: isSphinxEmpty ? "#6b7a99" : "#c8d3e8",
                  fontVariantNumeric: "tabular-nums",
                  width: "90px",
                  textAlign: "right",
                  fontStyle: isSphinxEmpty ? "italic" : "normal",
                }}
              >
                {isSphinxEmpty ? "coming online" : formatNumber(v)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ThroughputHero() {
  const [data, setData] = useState(MOCK_DATA);
  const pollRef = useRef(null);
  const esRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    const startPolling = () => {
      if (pollRef.current) return;
      const fetchOnce = async () => {
        try {
          const res = await fetch(`${STREAM_COUNTER_URL}/api/dashboard/hero`);
          if (!res.ok) throw new Error("bad status");
          const json = await res.json();
          if (!cancelled) setData(json);
        } catch (e) {
          // keep last good data (or mock)
        }
      };
      fetchOnce();
      pollRef.current = setInterval(fetchOnce, 10000);
    };

    try {
      const es = new EventSource(`${STREAM_COUNTER_URL}/api/throughput/stream`);
      esRef.current = es;
      es.onmessage = (ev) => {
        try {
          const json = JSON.parse(ev.data);
          if (!cancelled) setData(json);
        } catch (e) {
          // ignore parse errors
        }
      };
      es.onerror = () => {
        es.close();
        esRef.current = null;
        startPolling();
      };
    } catch (e) {
      startPolling();
    }

    return () => {
      cancelled = true;
      if (esRef.current) esRef.current.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const rates = data.rates || {};

  return (
    <div
      style={{
        padding: "24px",
        borderBottom: "1px solid #111828",
        background: "#0a0e18",
      }}
    >
      <div style={{ display: "flex", alignItems: "stretch", gap: "8px" }}>
        <Counter
          label="Samples Analyzed"
          value={formatNumber(data.total_samples)}
          rate={`${(rates.samples_per_hour ?? 0).toFixed(1)} samples/hr`}
        />
        <div style={{ width: "1px", background: "#111828" }} />
        <Counter
          label="Measurements Completed"
          value={formatNumber(data.total_files)}
          rate={`${(rates.files_per_hour ?? 0).toFixed(1)} files/hr`}
        />
        <div style={{ width: "1px", background: "#111828" }} />
        <Counter
          label="Data Captured"
          value={data.total_bytes_human || "0 B"}
          rate={`${rates.bytes_per_hour_human ?? "0 B"}/hr`}
        />
      </div>
      <div
        style={{
          marginTop: "20px",
          paddingTop: "16px",
          borderTop: "1px solid #111828",
          display: "flex",
          gap: "8px",
        }}
      >
        <ContributionBars data={data} metric="samples" />
        <div style={{ width: "1px", background: "#111828" }} />
        <ContributionBars data={data} metric="files" />
        <div style={{ width: "1px", background: "#111828" }} />
        <ContributionBars data={data} metric="bytes" />
      </div>
    </div>
  );
}
