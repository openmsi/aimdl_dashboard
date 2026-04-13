# Claude Code Prompt: Add zoom control for dynamic image scaling

**Read CLAUDE.md first.** Then read `issues/03-zoom-dynamic-scaling.md` for
full context.

**Frontend only — no backend changes.**

## GitHub Issue

```bash
gh issue create \
  --title "feat: add zoom control for dynamic image grid scaling" \
  --body-file issues/03-zoom-dynamic-scaling.md \
  --label "enhancement"
```

Note the issue number returned.

## Branch

```bash
git checkout main
git pull
git checkout -b feature/zoom-control
```

## Overview

Add a zoom slider to the dashboard toolbar that controls how many columns of
visualization cards appear in the grid. This lets researchers switch between
a dense thumbnail overview and a detailed few-at-a-time inspection.

## Steps

### Step 1: Create ZoomControl component

Create `frontend/src/components/ZoomControl.jsx`:

A compact inline control with a minus button, a slider or 5 step indicators,
and a plus button. Props: `{ zoom, setZoom }` where zoom is 1–5.

Visual style:
- Same monospace font and color scheme as ViewModeSelector
- Magnifying glass icons (🔍 or simple +/- text) for the buttons
- Small enough to sit in the header bar without crowding
- Show the zoom level as a subtle indicator (e.g., filled/unfilled dots)

```jsx
const ZOOM_LEVELS = [
  { level: 1, label: "XL", minWidth: 500 },
  { level: 2, label: "L",  minWidth: 380 },
  { level: 3, label: "M",  minWidth: 280 },  // current default
  { level: 4, label: "S",  minWidth: 200 },
  { level: 5, label: "XS", minWidth: 150 },
];
```

Export `ZOOM_LEVELS` so StreamView can use it.

### Step 2: Add zoom state to Dashboard

In `frontend/src/components/Dashboard.jsx`:

1. Add `zoom` state, initialized from URL parameter or default 3:
   ```js
   const [zoom, setZoom] = useState(() => {
     const params = new URLSearchParams(window.location.search);
     const z = parseInt(params.get("zoom"));
     return (z >= 1 && z <= 5) ? z : 3;
   });
   ```

2. Pass `zoom` and `setZoom` to the Header component.
3. Pass `zoom` to StreamView and SampleComparisonView.

### Step 3: Add ZoomControl to Header

In `frontend/src/components/Header.jsx`:

1. Accept `zoom` and `setZoom` as additional props.
2. Render `<ZoomControl zoom={zoom} setZoom={setZoom} />` next to
   `<ViewModeSelector />` in the header bar, with a small divider between them.

### Step 4: Update StreamView to use zoom

In `frontend/src/components/StreamView.jsx`:

1. Accept a `zoom` prop (default 3).
2. Import `ZOOM_LEVELS` from `ZoomControl.jsx`.
3. Compute the minWidth from the zoom level:
   ```js
   const minWidth = ZOOM_LEVELS.find(z => z.level === zoom)?.minWidth || 280;
   ```
4. Update the grid style:
   ```js
   gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`
   ```

### Step 5: Update SampleComparisonView to use zoom

The three-column instrument layout should be unaffected, but the VizCards
within each column could use the zoom level for their size. This is optional
— only implement if it looks natural.

### Step 6: Add transition animation

Add a CSS transition to the grid container so column changes feel smooth:
```js
transition: "all 0.3s ease"
```

Test and remove if it feels janky. Instant reflow is fine too.

### Step 7: Persist zoom in URL

When zoom changes, update the URL search params without a page reload:
```js
useEffect(() => {
  const url = new URL(window.location);
  if (zoom === 3) {
    url.searchParams.delete("zoom");
  } else {
    url.searchParams.set("zoom", zoom);
  }
  window.history.replaceState({}, "", url);
}, [zoom]);
```

### Step 8: Commit, push, and create PR

```bash
git add -A
git commit -m "feat: add zoom control for dynamic grid scaling

Added a 5-level zoom control to the header bar that adjusts the grid column
width from 500px (2 columns) down to 150px (6+ columns). Zoom level persists
in the URL parameter ?zoom=N for kiosk configuration.

Closes #ISSUE_NUMBER"
git push -u origin feature/zoom-control

gh pr create \
  --title "feat: add zoom control for dynamic grid scaling" \
  --body "## Summary

Adds a zoom slider to the dashboard toolbar that controls visualization card
size in the grid, from large (2 columns) to thumbnail (6+ columns).

## Changes

- Created \`ZoomControl\` component with +/- buttons and level indicator
- Added zoom state to Dashboard, passed to Header and StreamView
- StreamView grid \`minmax\` value driven by zoom level
- Zoom persists in URL parameter \`?zoom=N\`

## Testing

- All 5 zoom levels produce expected column counts
- Default level 3 matches previous behavior exactly
- Zoom persists across page reloads via URL parameter
- Spotlight view unaffected

Closes #ISSUE_NUMBER" \
  --base main
```

## Verification Checklist

- [ ] GitHub issue created
- [ ] ZoomControl renders in the header bar
- [ ] Clicking +/- changes the number of grid columns
- [ ] Zoom level 1 shows ~2 large columns
- [ ] Zoom level 5 shows ~6+ thumbnail columns
- [ ] Default (level 3) matches the existing layout exactly
- [ ] Zoom persists in URL parameter `?zoom=N`
- [ ] Spotlight view is unaffected by zoom
- [ ] No regressions
- [ ] Branch pushed, PR created and linked to issue
