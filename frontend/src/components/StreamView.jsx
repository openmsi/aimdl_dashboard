import VizCard from "./VizCard";
import { ZOOM_LEVELS } from "./ZoomControl";

function groupIntoPairs(items) {
  const result = [];
  const seen = new Set();

  for (let i = 0; i < items.length; i++) {
    if (seen.has(items[i].id)) continue;
    seen.add(items[i].id);

    if (items[i].pairKey) {
      const partner = items[i + 1];
      if (partner && partner.pairKey === items[i].pairKey) {
        seen.add(partner.id);
        result.push({ type: "pair", items: [items[i], partner] });
        continue;
      }
    }
    result.push({ type: "single", items: [items[i]] });
  }
  return result;
}

export default function StreamView({ filtered, onSelect, zoom = 3 }) {
  const minWidth = ZOOM_LEVELS.find((z) => z.level === zoom)?.minWidth || 280;
  const groups = groupIntoPairs(filtered);

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
      {groups.map((group, gi) =>
        group.type === "pair" ? (
          <div
            key={group.items[0].id}
            style={{
              gridColumn: "span 2",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              border: "1px solid #1e274040",
              borderRadius: "10px",
              padding: "6px",
              background: "#0a0e1880",
            }}
          >
            {group.items.map((viz) => (
              <VizCard key={viz.id} viz={viz} onClick={() => onSelect(viz)} />
            ))}
          </div>
        ) : (
          <div
            key={group.items[0].id}
            style={{
              animation: `slideIn 0.3s ease ${Math.min(gi * 0.03, 0.3)}s both`,
            }}
          >
            <VizCard
              viz={group.items[0]}
              spotlight={gi === 0}
              onClick={() => onSelect(group.items[0])}
            />
          </div>
        )
      )}
    </div>
  );
}
