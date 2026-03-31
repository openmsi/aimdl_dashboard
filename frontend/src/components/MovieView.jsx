import { useState, useEffect, useCallback, useMemo } from "react";
import { INSTRUMENTS, INSTRUMENT_COLORS, API_CONFIG } from "../config";
import { mapApiViz } from "../hooks/useVizStream";
import MockVisualization from "./MockVisualization";

const SPEEDS = [0.5, 1, 2, 4];

export default function MovieView({ data }) {
  const [selectedIgsn, setSelectedIgsn] = useState(null);
  const [selectedInstrument, setSelectedInstrument] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(false);

  const igsnOptions = useMemo(() => {
    const counts = {};
    data.forEach((v) => {
      const key = v.igsn || v.sample;
      if (key) counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([igsn]) => igsn);
  }, [data]);

  const instrumentOptions = useMemo(() => {
    if (!selectedIgsn) return [];
    const instruments = new Set();
    data.forEach((v) => {
      if ((v.igsn || v.sample) === selectedIgsn) {
        instruments.add(v.instrument);
      }
    });
    return [...instruments];
  }, [data, selectedIgsn]);

  useEffect(() => {
    if (igsnOptions.length > 0 && !selectedIgsn) {
      setSelectedIgsn(igsnOptions[0]);
    }
  }, [igsnOptions, selectedIgsn]);

  useEffect(() => {
    if (instrumentOptions.length > 0 && !instrumentOptions.includes(selectedInstrument)) {
      setSelectedInstrument(instrumentOptions[0]);
    }
  }, [instrumentOptions, selectedInstrument]);

  useEffect(() => {
    if (!selectedIgsn) return;
    setLoading(true);
    const url = new URL(`${API_CONFIG.baseUrl}/visualizations/sample/${selectedIgsn}`);
    if (selectedInstrument) {
      url.searchParams.set("instrument", selectedInstrument);
    }
    fetch(url)
      .then((res) => res.json())
      .then((json) => {
        setFrames(json.items.map(mapApiViz));
        setCurrentIndex(0);
        setPlaying(false);
      })
      .catch(() => {
        const filtered = data.filter(
          (v) =>
            (v.igsn || v.sample) === selectedIgsn &&
            (!selectedInstrument || v.instrument === selectedInstrument)
        );
        setFrames(filtered);
        setCurrentIndex(0);
        setPlaying(false);
      })
      .finally(() => setLoading(false));
  }, [selectedIgsn, selectedInstrument, data]);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const intervalMs = 1500 / speed;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % frames.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [playing, speed, frames.length]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.target.tagName === "SELECT") return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          setPlaying((p) => !p);
          break;
        case "ArrowLeft":
          e.preventDefault();
          setPlaying(false);
          setCurrentIndex((prev) => (prev - 1 + frames.length) % frames.length);
          break;
        case "ArrowRight":
          e.preventDefault();
          setPlaying(false);
          setCurrentIndex((prev) => (prev + 1) % frames.length);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSpeed((s) => {
            const idx = SPEEDS.indexOf(s);
            return idx < SPEEDS.length - 1 ? SPEEDS[idx + 1] : s;
          });
          break;
        case "ArrowDown":
          e.preventDefault();
          setSpeed((s) => {
            const idx = SPEEDS.indexOf(s);
            return idx > 0 ? SPEEDS[idx - 1] : s;
          });
          break;
      }
    },
    [frames.length]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const currentFrame = frames[currentIndex] || null;
  const instrumentColor =
    currentFrame && INSTRUMENT_COLORS[currentFrame.instrument]
      ? INSTRUMENT_COLORS[currentFrame.instrument]
      : "#4ECDC4";

  const selectStyle = {
    background: "#0d1220",
    border: "1px solid #1e2740",
    borderRadius: "5px",
    color: "#c8d3e8",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    padding: "6px 10px",
    cursor: "pointer",
  };

  const buttonStyle = (active) => ({
    background: active ? `${instrumentColor}20` : "transparent",
    border: `1px solid ${active ? instrumentColor + "60" : "#1e2740"}`,
    borderRadius: "5px",
    color: active ? instrumentColor : "#4a5672",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "16px",
    padding: "6px 12px",
    cursor: "pointer",
    transition: "all 0.2s",
    lineHeight: 1,
  });

  return (
    <div style={{ animation: "slideIn 0.3s ease" }}>
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#4a5672" }}>
          SAMPLE
          <select
            value={selectedIgsn || ""}
            onChange={(e) => setSelectedIgsn(e.target.value)}
            style={{ ...selectStyle, marginLeft: "8px" }}
          >
            {igsnOptions.map((igsn) => (
              <option key={igsn} value={igsn}>
                {igsn}
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "11px", color: "#4a5672" }}>
          INSTRUMENT
          <select
            value={selectedInstrument || ""}
            onChange={(e) => setSelectedInstrument(e.target.value)}
            style={{ ...selectStyle, marginLeft: "8px" }}
          >
            {instrumentOptions.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>
        </label>

        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "11px",
            color: "#3d4d6b",
            marginLeft: "auto",
          }}
        >
          {frames.length} position{frames.length !== 1 ? "s" : ""} | SPACE play/pause | ← → step | ↑ ↓ speed
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "420px",
          background: "#0a0f1a",
          borderRadius: "8px",
          border: "1px solid #1e2740",
          marginBottom: "16px",
          position: "relative",
        }}
      >
        {loading ? (
          <span style={{ color: "#4a5672", fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px" }}>
            Loading...
          </span>
        ) : frames.length === 0 ? (
          <span style={{ color: "#4a5672", fontFamily: "'IBM Plex Mono', monospace", fontSize: "13px" }}>
            No positions found for this sample
          </span>
        ) : currentFrame ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            {currentFrame.imageUrl ? (
              <img
                src={currentFrame.imageUrl}
                alt={currentFrame.vizType}
                style={{
                  maxWidth: "100%",
                  maxHeight: "360px",
                  objectFit: "contain",
                  borderRadius: "4px",
                }}
              />
            ) : (
              <div style={{ width: "400px", height: "300px" }}>
                <MockVisualization viz={currentFrame} />
              </div>
            )}
          </div>
        ) : null}
      </div>

      {frames.length > 0 && (
        <div
          style={{
            background: "#0d1220",
            borderRadius: "8px",
            border: "1px solid #1e2740",
            padding: "12px 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <button
              onClick={() => { setPlaying(false); setCurrentIndex(0); }}
              style={buttonStyle(false)}
              title="First"
            >
              ⏮
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setCurrentIndex((prev) => (prev - 1 + frames.length) % frames.length);
              }}
              style={buttonStyle(false)}
              title="Previous"
            >
              ◀
            </button>
            <button
              onClick={() => setPlaying((p) => !p)}
              style={buttonStyle(playing)}
              title={playing ? "Pause" : "Play"}
            >
              {playing ? "⏸" : "▶"}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setCurrentIndex((prev) => (prev + 1) % frames.length);
              }}
              style={buttonStyle(false)}
              title="Next"
            >
              ▶
            </button>
            <button
              onClick={() => { setPlaying(false); setCurrentIndex(frames.length - 1); }}
              style={buttonStyle(false)}
              title="Last"
            >
              ⏭
            </button>

            <div
              style={{
                marginLeft: "16px",
                display: "flex",
                gap: "4px",
                alignItems: "center",
                flex: 1,
                maxWidth: "400px",
              }}
            >
              {frames.map((_, i) => (
                <div
                  key={i}
                  onClick={() => { setPlaying(false); setCurrentIndex(i); }}
                  style={{
                    flex: 1,
                    height: i === currentIndex ? "10px" : "6px",
                    background: i === currentIndex ? instrumentColor : i < currentIndex ? `${instrumentColor}60` : "#1e2740",
                    borderRadius: "3px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    minWidth: "4px",
                  }}
                />
              ))}
            </div>

            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: "12px",
                color: "#c8d3e8",
                minWidth: "50px",
                textAlign: "right",
              }}
            >
              {currentIndex + 1}/{frames.length}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "11px",
            }}
          >
            <div style={{ display: "flex", gap: "12px", color: "#4a5672" }}>
              <span>
                speed:{" "}
                {SPEEDS.map((s) => (
                  <span
                    key={s}
                    onClick={() => setSpeed(s)}
                    style={{
                      color: s === speed ? instrumentColor : "#4a5672",
                      cursor: "pointer",
                      padding: "2px 4px",
                    }}
                  >
                    {s}x
                  </span>
                ))}
              </span>
            </div>
            <div style={{ display: "flex", gap: "16px" }}>
              {currentFrame.position && (
                <span style={{ color: "#6b7a99" }}>
                  Position: <span style={{ color: instrumentColor }}>{currentFrame.position}</span>
                </span>
              )}
              <span style={{ color: "#6b7a99" }}>
                {currentFrame.igsn || currentFrame.sample}
              </span>
              <span style={{ color: instrumentColor }}>
                {currentFrame.instrument}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
