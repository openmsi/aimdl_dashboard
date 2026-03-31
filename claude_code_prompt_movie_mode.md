# Claude Code Prompt: Sample movie mode — animate through positions

**Read CLAUDE.md first.** Then read `issues/04-sample-movie-mode.md` for
full context.

## GitHub Issue

```bash
gh issue create \
  --title "feat: sample movie mode — animate through measurement positions" \
  --body-file issues/04-sample-movie-mode.md \
  --label "enhancement"
```

Note the issue number returned.

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

Note: The movie needs ALL positions for the sample. Ensure the limit is high
enough or query `_cache["visualizations"]` directly filtered by IGSN.

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
- `selectedInstrument` — which instrument
- `currentIndex` — current position in the sorted array
- `playing` — boolean
- `speed` — playback speed multiplier (0.5, 1, 2, 4)
- `frames` — computed array sorted by position

**Sample selector:** Extract unique IGSNs from data, default to the one
with the most measurement positions.

**Playback logic:**
```js
useEffect(() => {
  if (!playing || frames.length === 0) return;
  const intervalMs = 1500 / speed;
  const timer = setInterval(() => {
    setCurrentIndex(prev => (prev + 1) % frames.length);
  }, intervalMs);
  return () => clearInterval(timer);
}, [playing, speed, frames.length]);
```

**Keyboard shortcuts:** Space (play/pause), Left/Right (step),
Up/Down (speed).

**Image display:** Large centered image with position/IGSN/instrument
metadata below.

**Scrubber bar:** Clickable dots for each position, current highlighted.

**Styling:** Dark background, monospace font, instrument-colored accents.

### Step 7: Wire MovieView into Dashboard

In `Dashboard.jsx`, import MovieView and render for `viewMode === "movie"`.
Pass the full `data` array (not `filtered`).

### Step 8: Fetch sample-specific data

MovieView should fetch from the sample endpoint to get ALL positions:
```js
useEffect(() => {
  if (!selectedIgsn) return;
  fetch(`${API_CONFIG.baseUrl}/visualizations/sample/${selectedIgsn}`)
    .then(res => res.json())
    .then(data => setFrames(data.items.map(mapApiViz)))
    .catch(console.error);
}, [selectedIgsn, selectedInstrument]);
```

### Step 9: Commit, push, and create PR

```bash
git add -A
git commit -m "feat: add movie mode for animating across sample positions

Added a Movie view mode that lets researchers select a sample and instrument,
then animate through measurement positions as a flipbook. Includes play/pause,
speed control, keyboard shortcuts, and a position scrubber bar.

Backend: position extraction from folder names, sample-specific API endpoint.
Frontend: MovieView component with playback controls.

Closes #ISSUE_NUMBER"
git push -u origin feature/movie-mode

gh pr create \
  --title "feat: add movie mode for animating across sample positions" \
  --body "## Summary

New Movie view mode that animates through all measurement positions for a
selected sample, revealing spatial variation across the sample surface.

## Changes

**Backend:**
- Extract position identifiers from MAXIMA and HELIX folder names
- Added \`position\` field to Visualization model
- New endpoint \`GET /api/visualizations/sample/{igsn}\` returning all
  positions sorted naturally

**Frontend:**
- Added Movie mode to ViewModeSelector
- Created MovieView component with:
  - Sample/instrument selectors
  - Play/pause, forward/back, speed controls
  - Position scrubber bar
  - Keyboard shortcuts (Space, arrows)
  - Large centered image display with metadata overlay

## Testing

- Play/pause animates through positions sequentially
- Speed control works (0.5x through 4x)
- Scrubber bar allows jumping to specific positions
- Works with both MAXIMA and HELIX data
- Handles samples with single positions gracefully
- No regressions in other view modes

Closes #ISSUE_NUMBER" \
  --base main
```

Replace `#ISSUE_NUMBER` with the actual number.

## Verification Checklist

- [ ] GitHub issue created
- [ ] Position extracted from MAXIMA folder names
- [ ] Position extracted from HELIX shot folder names
- [ ] `/api/visualizations/sample/{igsn}` returns sorted positions
- [ ] MovieView renders with sample and instrument selectors
- [ ] Play/pause works
- [ ] Speed control works
- [ ] Scrubber bar works
- [ ] Keyboard shortcuts work
- [ ] Handles single-position samples gracefully
- [ ] No regressions in other views
- [ ] Branch pushed, PR created and linked to issue
