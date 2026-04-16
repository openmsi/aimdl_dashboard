import VizCard from "./VizCard";
import { ZOOM_LEVELS } from "./ZoomControl";

export function groupIntoPairs(items) {
  const pairMap = new Map();
  for (const item of items) {
    if (item.pairKey) {
      if (!pairMap.has(item.pairKey)) {
        pairMap.set(item.pairKey, []);
      }
      pairMap.get(item.pairKey).push(item);
    }
  }

  const result = [];
  const consumed = new Set();

  for (const item of items) {
    if (consumed.has(item.id)) continue;
    consumed.add(item.id);

    if (!item.pairKey) {
      result.push({ type: "single", items: [item] });
      continue;
    }

    const partners = pairMap.get(item.pairKey);
    const partner = partners
      ? partners.find((p) => p.id !== item.id && !consumed.has(p.id))
      : null;

    if (partner) {
      consumed.add(partner.id);
      const pair =
        item.pairRole === "scan" ? [item, partner] : [partner, item];
      result.push({ type: "pair", items: pair });
    } else {
      result.push({ type: "single", items: [item] });
    }
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
