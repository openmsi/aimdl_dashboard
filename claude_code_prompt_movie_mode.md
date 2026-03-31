# Claude Code Prompt: Sample movie mode — animate through positions

**Read CLAUDE.md first.** Then read `issues/04-sample-movie-mode.md` for
full context.

## Branch

```bash
git checkout main
git pull
git checkout -b feature/movie-mode
```

## Overview

Add a "Movie" view mode that lets a researcher select a sample (IGSN) and
instrument, then animate through all measurement positions as a flipbook.
This reveals spatial variation across the sample surface.

## Backend Changes

### Step 1: Extract position from MAXIMA folder names

In `backend/src/aimdl_dashboard_api/discovery.py`, extract a position
identifier from MAXIMA experiment folder names.

The folder name pattern is:
```
{IGSN}_{girder_id}_{position_info}_{date}
```
Example: `JHXMAL00005_69c15fbb7590bb7e1ed257bc_0_765_2026-03-23_15-59-06`

Extract position as the segment(s) between the Girder hex ID and the date.
The Girder ID is a 24-character hex string. The date matches `\d{4}-\d{2}-\d{2}`.

```python
import re

def _extract_position(folder_name, instrument):
    """Extract a position identifier from the folder name."""
    if instrument == "MAXIMA":
        # Pattern: {IGSN}_{24-hex-chars}_{position}_{YYYY-MM-DD}_{time}
        m = re.match(
            r'^[A-Z0-9-]+_[0-9a-f]{24}_(.+?)_\d{4}-\d{2}-\d{2}_',
            folder_name
        )
        if m:
            return m.group(1)  # e.g., "0_765"
    elif instrument == "HELIX":
        # For HELIX, position comes from shot info — extract shot number
        m = re.search(r'shot(\d+)', folder_name)
        if m:
            return f"shot{m.group(1)}"
    return None
```

Add `position` to each viz dict in `_discover_maxima()` and `_discover_helix()`:
```python
position = _extract_position(exp_folder["name"], "MAXIMA")
results.append({
    ...existing fields...
    "position": position,
})
```

### Step 2: Add sample-specific endpoint

In `backend/src/aimdl_dashboard_api/app.py`, add:

```python
@app.get("/api/visualizations/sample/{igsn}")
def get_sample_visualizations(
    igsn: str,
    instrument: Optional[str] = Query(None),
):
    """Return all visualizations for a sample, sorted by position."""
    items = get_cached_visualizations(igsn=igsn, limit=500)
    if instrument:
        items = [v for v in items if v["instrument"] == instrument]

    # Sort by position (natural sort so "0_765" < "0_1000")
    def position_sort_key(v):
        pos = v.get("position") or ""
        # Try to extract numeric parts for natural sorting
        parts = re.findall(r'\d+', pos)
        return tuple(int(p) for p in parts) if parts else (pos,)

    items.sort(key=position_sort_key)

    viz_list = [
        Visualization(
            id=v["id"],
            ...same mapping as list_visualizations...
        )
        for v in items
    ]
    return {"items": viz_list, "total": len(viz_list), "igsn": igsn}
```

Note: `get_cached_visualizations` needs its `limit` increased or removed
for this call — the movie needs ALL positions for the sample. If issue #1
(the limit bug) has been fixed with the `_cache_by_id` approach, the
`get_cached_visualizations` function's limit should be raised to handle
this use case, or the sample endpoint should query `_cache["visualizations"]`
directly filtered by IGSN.

### Step 3: Update models.py

Add `position` to the Visualization model:
```python
class Visualization(BaseModel):
    ...existing fields...
    position: str | None = None
```

Update the mapping in `app.py`'s `list_visualizations` to include position.

## Frontend Changes

### Step 4: Map position in useVizStream

In `frontend/src/hooks/useVizStream.js`, update `mapApiViz`:
```js
function mapApiViz(viz) {
  return {
    ...existing fields...
    position: viz.position || null,
  };
}
```

### Step 5: Add Movie mode to ViewModeSelector

In `frontend/src/components/ViewModeSelector.jsx`, add a fourth mode:
```js
{ key: "movie", label: "Movie", icon: "▶" },
```

### Step 6: Create MovieView component

Create `frontend/src/components/MovieView.jsx`:

**Layout:**
```
┌─────────────────────────────────────────────┐
│  [Sample selector ▼]  [Instrument selector] │
├─────────────────────────────────────────────┤
│                                             │
│           Large visualization               │
│             (centered)                      │
│                                             │
├─────────────────────────────────────────────┤
│  ⏮  ◀  ▶/⏸  ▶  ⏭   [===●====]  3/12     │
│                        speed: 1x            │
│  Position: 0_765  |  JHXMAL00005            │
└─────────────────────────────────────────────┘
```

**Props:** `{ data }` — the full unfiltered data array from useVizStream.

**State:**
- `selectedIgsn` — which sample to show
- `selectedInstrument` — which instrument (if sample has multiple)
- `currentIndex` — current position in the sorted position array
- `playing` — boolean
- `speed` — playback speed multiplier (0.5, 1, 2, 4)
- `frames` — computed array of viz items for the selected sample+instrument,
  sorted by position

**Sample selector:**
Extract unique IGSNs from data, show as a dropdown or button group.
Default to the IGSN with the most measurement positions.

**Playback logic:**
```js
useEffect(() => {
  if (!playing || frames.length === 0) return;
  const intervalMs = 1500 / speed;  // 1.5 seconds base, adjusted by speed
  const timer = setInterval(() => {
    setCurrentIndex(prev => (prev + 1) % frames.length);
  }, intervalMs);
  return () => clearInterval(timer);
}, [playing, speed, frames.length]);
```

**Keyboard shortcuts:**
```js
useEffect(() => {
  function handleKey(e) {
    if (e.code === "Space") { e.preventDefault(); setPlaying(p => !p); }
    if (e.code === "ArrowRight") { setCurrentIndex(i => Math.min(i + 1, frames.length - 1)); }
    if (e.code === "ArrowLeft") { setCurrentIndex(i => Math.max(i - 1, 0)); }
    if (e.code === "ArrowUp") { setSpeed(s => Math.min(s * 2, 4)); }
    if (e.code === "ArrowDown") { setSpeed(s => Math.max(s / 2, 0.5)); }
  }
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [frames.length]);
```

**Image display:**
Show the current frame's visualization large and centered. Use the same
`<img>` / `MockVisualization` fallback pattern as VizCard. Below the image,
show position, IGSN, instrument, and timestamp metadata.

**Scrubber bar:**
A horizontal bar showing all positions as small clickable dots or segments.
The current position is highlighted. Clicking a dot jumps to that frame.

**Styling:**
- Dark background, consistent with the rest of the dashboard
- Playback controls in monospace font, instrument-colored accents
- Position indicator uses a subtle progress bar

### Step 7: Wire MovieView into Dashboard

In `frontend/src/components/Dashboard.jsx`:

1. Import MovieView.
2. Add rendering for `viewMode === "movie"`:
   ```jsx
   {viewMode === "movie" && (
     <MovieView data={data} />
   )}
   ```
   Note: pass the full `data` array (not `filtered`), since the movie
   view has its own sample/instrument selectors.

### Step 8: Fetch sample-specific data (optional enhancement)

If the cached data doesn't include all positions for a sample (because
the main endpoint limits to 30 per instrument), MovieView can fetch
directly from the sample endpoint:

```js
useEffect(() => {
  if (!selectedIgsn) return;
  const url = `${API_CONFIG.baseUrl}/visualizations/sample/${selectedIgsn}`;
  fetch(url)
    .then(res => res.json())
    .then(data => setFrames(data.items.map(mapApiViz)))
    .catch(console.error);
}, [selectedIgsn, selectedInstrument]);
```

This ensures the movie has ALL positions even if the main cache is limited.

## Verification Checklist

- [ ] Position is extracted from MAXIMA folder names in discovery.py
- [ ] Position is extracted from HELIX shot folder names
- [ ] `/api/visualizations/sample/{igsn}` returns all positions sorted
- [ ] MovieView renders with sample and instrument selectors
- [ ] Play/pause animates through positions sequentially
- [ ] Speed control works (0.5x through 4x)
- [ ] Scrubber bar shows position progress and allows clicking to jump
- [ ] Keyboard shortcuts work (Space, arrows)
- [ ] Forward/back buttons step one frame at a time
- [ ] Position metadata displays below the image
- [ ] Works with both MAXIMA and HELIX data
- [ ] Gracefully handles samples with only one position
- [ ] No regressions in other view modes
- [ ] Commit message: "feat: add movie mode for animating across sample positions"
