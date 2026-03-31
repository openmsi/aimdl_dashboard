import { useState, useEffect } from "react";
import { INSTRUMENTS, INSTRUMENT_COLORS } from "../config";
import useVizStream from "../hooks/useVizStream";
import Header from "./Header";
import InstrumentTab from "./InstrumentTab";
import StreamView from "./StreamView";
import SpotlightView from "./SpotlightView";
import SampleComparisonView from "./SampleComparisonView";
import VizDetailModal from "./VizDetailModal";
import StatusBar from "./StatusBar";

export default function Dashboard() {
  const [filter, setFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState("stream");
  const [selectedViz, setSelectedViz] = useState(null);
  const [zoom, setZoom] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const z = parseInt(params.get("zoom"));
    return (z >= 1 && z <= 5) ? z : 3;
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inst = params.get("instrument");
    if (inst && INSTRUMENTS.some((i) => i.id === inst.toUpperCase())) {
      setFilter(inst.toUpperCase());
    }
    const view = params.get("view");
    if (view && ["stream", "spotlight", "sample"].includes(view)) {
      setViewMode(view);
    }
  }, []);

  useEffect(() => {
    const url = new URL(window.location);
    if (zoom === 3) {
      url.searchParams.delete("zoom");
    } else {
      url.searchParams.set("zoom", zoom);
    }
    window.history.replaceState({}, "", url);
  }, [zoom]);

  const { data, filtered, counts, lastUpdate } = useVizStream({ filter });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#080c15",
        color: "#c8d3e8",
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header viewMode={viewMode} setViewMode={setViewMode} zoom={zoom} setZoom={setZoom} />

      <div
        style={{
          padding: "12px 24px",
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid #111828",
          alignItems: "center",
        }}
      >
        <InstrumentTab
          name="ALL"
          active={filter === "ALL"}
          color="#c8d3e8"
          count={counts.ALL}
          onClick={() => setFilter("ALL")}
        />
        {INSTRUMENTS.map((inst) => (
          <InstrumentTab
            key={inst.id}
            name={inst.id}
            active={filter === inst.id}
            color={INSTRUMENT_COLORS[inst.id]}
            count={counts[inst.id]}
            onClick={() => setFilter(inst.id)}
          />
        ))}
        <div style={{ marginLeft: "auto" }}>
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: "10px",
              color: "#3d4d6b",
            }}
          >
            TIP: Open{" "}
            <span style={{ color: "#6b7a99" }}>?instrument=MAXIMA</span> in
            separate window for dedicated view
          </span>
        </div>
      </div>

      <div style={{ flex: 1, padding: "20px 24px", overflow: "auto" }}>
        {viewMode === "spotlight" && <SpotlightView filtered={filtered} />}

        {viewMode === "stream" && (
          <StreamView filtered={filtered} onSelect={setSelectedViz} zoom={zoom} />
        )}

        {viewMode === "sample" && (
          <div style={{ animation: "slideIn 0.3s ease" }}>
            <SampleComparisonView data={filtered} />
          </div>
        )}
      </div>

      {selectedViz && (
        <VizDetailModal
          viz={selectedViz}
          onClose={() => setSelectedViz(null)}
        />
      )}

      <StatusBar data={data} lastUpdate={lastUpdate} />
    </div>
  );
}
