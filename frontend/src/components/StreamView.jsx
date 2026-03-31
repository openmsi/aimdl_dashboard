import VizCard from "./VizCard";
import { ZOOM_LEVELS } from "./ZoomControl";

export default function StreamView({ filtered, onSelect, zoom = 3 }) {
  const minWidth = ZOOM_LEVELS.find((z) => z.level === zoom)?.minWidth || 280;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
        gap: "14px",
        animation: "slideIn 0.3s ease",
        transition: "all 0.3s ease",
      }}
    >
      {filtered.map((viz, i) => (
        <div
          key={viz.id}
          style={{
            animation: `slideIn 0.3s ease ${Math.min(i * 0.03, 0.3)}s both`,
          }}
        >
          <VizCard
            viz={viz}
            spotlight={i === 0}
            onClick={() => onSelect(viz)}
          />
        </div>
      ))}
    </div>
  );
}
