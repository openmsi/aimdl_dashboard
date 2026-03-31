import { INSTRUMENT_COLORS } from "../config";

function generateMockPlot(viz, width, height) {
  const seed = viz.id * 13.37;
  const points = [];
  const n = 60;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * width * 0.85 + width * 0.08;
    const base = Math.sin((i / n) * Math.PI * 2 + seed) * height * 0.25;
    const noise = Math.sin(i * 3.7 + seed * 2) * height * 0.08;
    const peak =
      Math.exp(-Math.pow((i - n * 0.35) / (n * 0.08), 2)) * height * 0.3 +
      Math.exp(-Math.pow((i - n * 0.65) / (n * 0.06), 2)) * height * 0.2;
    const y = height * 0.55 - base - noise - peak;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(" ");
}

export default function MockVisualization({ viz, width = 320, height = 200, large = false }) {
  const w = large ? 560 : width;
  const h = large ? 340 : height;
  const polyline = generateMockPlot(viz, w, h);
  const instColor = INSTRUMENT_COLORS[viz.instrument];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: "100%", height: "100%", display: "block" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`grad-${viz.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={viz.vizColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={viz.vizColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width={w} height={h} fill="#0a0e17" rx="4" />
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={`h-${f}`}
          x1={w * 0.06}
          y1={h * f}
          x2={w * 0.95}
          y2={h * f}
          stroke="#1a2035"
          strokeWidth="0.5"
        />
      ))}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={`v-${f}`}
          x1={w * f}
          y1={h * 0.08}
          x2={w * f}
          y2={h * 0.92}
          stroke="#1a2035"
          strokeWidth="0.5"
        />
      ))}
      <polyline
        points={polyline}
        fill="none"
        stroke={viz.vizColor}
        strokeWidth={large ? 2 : 1.5}
        strokeLinejoin="round"
      />
      <polygon
        points={`${(w * 0.08).toFixed(1)},${(h * 0.88).toFixed(1)} ${polyline} ${(
          w * 0.93
        ).toFixed(1)},${(h * 0.88).toFixed(1)}`}
        fill={`url(#grad-${viz.id})`}
      />
      <text
        x={w * 0.06}
        y={h * 0.08}
        fill="#8892a8"
        fontSize={large ? 13 : 10}
        fontFamily="'IBM Plex Mono', monospace"
      >
        {viz.vizType}
      </text>
      <rect
        x={w - (large ? 100 : 78)}
        y={4}
        width={large ? 96 : 74}
        height={large ? 22 : 18}
        rx={3}
        fill={instColor}
        fillOpacity="0.15"
        stroke={instColor}
        strokeWidth="0.5"
      />
      <text
        x={w - (large ? 52 : 41)}
        y={large ? 19 : 16}
        fill={instColor}
        fontSize={large ? 11 : 9}
        fontFamily="'IBM Plex Mono', monospace"
        textAnchor="middle"
      >
        {viz.instrument}
      </text>
    </svg>
  );
}
