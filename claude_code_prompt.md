# Claude Code Prompt: Scaffold AIMD-L Dashboard

**Read CLAUDE.md first.** It contains the full project context, architecture,
conventions, and directory structure.

**Read `frontend/PROTOTYPE.jsx` next.** It is the monolithic reference
implementation containing all components, styling, mock data generation,
and layout logic in a single file. Your job is to decompose it.

## Objective

Scaffold a working Vite + React dashboard application from the monolithic
prototype at `frontend/PROTOTYPE.jsx`. The result should `npm install && npm run dev`
cleanly and render identically to the prototype, with the codebase properly
decomposed into components, hooks, and configuration. Delete `PROTOTYPE.jsx`
after decomposition is verified working.

## Steps

Execute these steps in order. After each step, verify the result compiles
and renders before proceeding.

---

### Step 1: Initialize the Vite React project

```bash
cd /Users/elbert/Documents/GitHub/htmdec/aimdl_dashboard/frontend
npm create vite@latest . -- --template react
```

Note: the `frontend/` directory already exists and contains `PROTOTYPE.jsx`.
Vite's scaffolding should work alongside it.

- Remove the default Vite boilerplate files: `src/App.css`, `src/index.css`,
  `src/assets/react.svg`, `public/vite.svg`
- Clear the contents of `src/App.jsx` (we will replace it)
- Install dependencies: `npm install`
- Verify `npm run dev` launches without errors (will show blank page, that's fine)

---

### Step 2: Create globals.css

Create `frontend/src/styles/globals.css` with:

- Google Fonts import for IBM Plex Mono (400, 500, 600) and IBM Plex Sans (400, 500, 600)
- CSS reset (box-sizing, margin/padding zero)
- Custom scrollbar styling (dark theme: track #080c15, thumb #1e2740)
- Keyframe animations:
  - `pulse`: opacity 1 → 0.4 → 1 over 2s infinite
  - `slideIn`: opacity 0 + translateY(8px) → opacity 1 + translateY(0) over 0.3s

Import this in `main.jsx`.

---

### Step 3: Create config.js

Create `frontend/src/config.js` exactly as specified in CLAUDE.md.
This is the single source of truth for instruments, colors, Girder settings,
sample positions, and visualization types. Extract the constants from
`PROTOTYPE.jsx` (INSTRUMENTS, INSTRUMENT_COLORS, INSTRUMENT_DESCRIPTIONS,
SAMPLE_POSITIONS, VIZ_TYPES) and restructure them per the CLAUDE.md spec.

---

### Step 4: Create the useVizStream hook

Create `frontend/src/hooks/useVizStream.js`.

This hook encapsulates ALL data fetching logic. It returns:
```js
{ data, filtered, counts, lastUpdate }
```

Parameters:
```js
useVizStream({ filter, pollIntervalMs })
```

**For Phase 1 (mock mode):**
- On mount, generate 24 mock visualizations using a `generateMockViz` function
- Every `pollIntervalMs` (default 8000), prepend a new mock viz with current timestamp
- Cap the array at 60 items
- `filtered` applies the instrument filter
- `counts` is `{ ALL: n, MAXIMA: n, HELIX: n, SPHINX: n }`

The `generateMockViz(id)` function should match the one in `PROTOTYPE.jsx`:
- Randomly select instrument, sample position, viz type from config
- Generate a timestamp within the last 5 minutes (for initial batch) or now (for new arrivals)
- Return `{ id, instrument, sample, vizType, vizColor, timestamp, girderUrl, status }`
- `status` is "complete" 90% of the time, "processing" 10%

**Important:** Export `generateMockViz` as well, so `MockVisualization` can use
the viz ID to seed its procedural plot.

Later, this hook will be modified to call the Girder REST API instead of
generating mock data. The interface to consuming components will not change.

---

### Step 5: Create components

Create each component as a separate file in `frontend/src/components/`.
Extract directly from `frontend/PROTOTYPE.jsx`, preserving ALL visual
behavior — every style, every color value, every animation, every hover
effect must match exactly.

Create in this order (each file should be self-contained with its own
inline styles):

1. **MockVisualization.jsx** — The SVG procedural plot generator.
   Props: `{ viz, width, height, large }`. Uses the viz ID to seed
   deterministic pseudo-random plot curves. Includes grid lines,
   data polyline with gradient fill, type label, and instrument badge.
   Also extract `generateMockPlot` into this file.

2. **InstrumentTab.jsx** — Filter tab button.
   Props: `{ name, active, color, count, onClick }`.
   Shows colored dot, name, and count badge.

3. **VizCard.jsx** — Individual visualization card.
   Props: `{ viz, spotlight, onClick }`.
   Contains MockVisualization, metadata row (type, time ago, instrument, sample).
   Hover effects: border color change, translateY(-2px).
   Shows "PROCESSING" badge when `viz.status === "processing"`.
   Also extract the `timeAgo` utility (or put it in a shared utils.js).

4. **ViewModeSelector.jsx** — Three-button toggle for stream/spotlight/sample.
   Props: `{ mode, setMode }`.

5. **StatusBar.jsx** — Footer status bar.
   Props: `{ data, lastUpdate }`.
   Shows connection status dot, viz count, processing count, last update time, poll interval.

6. **Header.jsx** — Top bar.
   Props: `{ viewMode, setViewMode }`.
   Shows "AIMD-L Live" title, lab name subtitle, and ViewModeSelector.

7. **SpotlightView.jsx** — Latest viz large + history filmstrip sidebar.
   Props: `{ filtered }`.
   Two-column grid: large MockVisualization on left, list of VizCards on right.

8. **StreamView.jsx** — Responsive grid of VizCards.
   Props: `{ filtered, onSelect }`.
   Uses CSS grid with `repeat(auto-fill, minmax(280px, 1fr))`.
   First card gets `spotlight={true}`.

9. **SampleComparisonView.jsx** — Cross-instrument by sample position.
   Props: `{ data }`.
   Has its own sample selector buttons.
   Three-column grid (one per instrument), showing up to 3 most recent
   VizCards per instrument for the selected sample.

10. **VizDetailModal.jsx** — Click-to-expand overlay.
    Props: `{ viz, onClose }`.
    Full-screen backdrop with blur, centered card showing large MockVisualization
    and metadata grid (instrument, sample, timestamp, status, Girder ID, pipeline).
    "Open in Girder" and "Close" buttons.

11. **Dashboard.jsx** — Main container that wires everything together.
    Reads URL query parameters on mount for initial filter and view mode.
    Uses `useVizStream` hook. Manages `filter`, `viewMode`, and `selectedViz` state.
    Renders Header, filter bar (InstrumentTabs), content area (conditional on viewMode),
    VizDetailModal (when selectedViz is set), and StatusBar.

---

### Step 6: Wire up App.jsx and main.jsx

**main.jsx:**
```jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**App.jsx:**
```jsx
import Dashboard from "./components/Dashboard";

export default function App() {
  return <Dashboard />;
}
```

---

### Step 7: Update index.html

Edit `frontend/index.html`:
- Set `<title>AIMD-L Live Dashboard</title>`
- Ensure the root div has `id="root"`
- No additional scripts or stylesheets needed (Vite handles injection)

---

### Step 8: Verify

Run `npm run dev` in the `frontend/` directory. Verify:

1. The page loads with dark background and "AIMD-L Live" header
2. Mock visualizations appear in a grid (Stream view)
3. Clicking instrument tabs filters the grid
4. Switching to Spotlight view shows one large viz + sidebar
5. Switching to Sample view shows three-column instrument comparison
6. Clicking a VizCard opens the detail modal
7. New visualizations appear every ~8 seconds
8. Adding `?instrument=MAXIMA` to the URL filters to MAXIMA only

---

### Step 9: Clean up

- Delete `frontend/PROTOTYPE.jsx` — it has served its purpose
- Verify the app still runs after deletion

---

### Step 10: Update .gitignore

The `.gitignore` already has Node.js entries appended. Verify these are present:

```
# Node
node_modules/
frontend/node_modules/
frontend/dist/
```

If not, add them.

---

### Step 11: Update README.md

Replace the README with a proper project README covering:

- Project name and one-line description
- Screenshot placeholder (`<!-- TODO: add screenshot -->`)
- Quick start instructions (`cd frontend && npm install && npm run dev`)
- URL parameter documentation (table from CLAUDE.md)
- Architecture overview (from CLAUDE.md, simplified)
- Deployment section (kiosk mode command for Raspberry Pi)
- Phase roadmap (Phase 1: mock, Phase 2: Girder, Phase 3: SSE)
- License reference
- Note that this project is part of the AIMD-L / HTMDEC infrastructure at JHU

---

### Step 12: Create backend placeholder

Create `backend/README.md`:

```markdown
# AIMD-L Dashboard Backend

Phase 2 — FastAPI service for proxying Girder API queries and (Phase 3)
serving SSE streams of new visualizations.

Not yet implemented. The frontend currently runs standalone with mock data.

## Planned Stack

- FastAPI + uvicorn
- girder-client or httpx for Girder REST API
- SSE via StreamingResponse
- Optional: Kafka consumer via confluent-kafka-python (Phase 3)
```

---

## Verification Checklist

After all steps are complete, verify:

- [ ] `cd frontend && npm install` succeeds with no errors
- [ ] `npm run dev` launches dev server
- [ ] Dashboard renders with all three view modes
- [ ] URL parameter `?instrument=MAXIMA` works
- [ ] URL parameter `?view=spotlight` works
- [ ] No console errors in browser DevTools
- [ ] `npm run build` produces a clean production build in `frontend/dist/`
- [ ] `frontend/PROTOTYPE.jsx` has been deleted
- [ ] All files follow conventions in CLAUDE.md
