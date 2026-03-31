# Issue #4: Sample movie mode — animate through measurement positions

## Problem

When a sample has been measured at multiple positions (e.g., a grid of XRD
measurements across a sample surface), researchers want to see how the
visualization changes across positions. Currently, all positions appear in a
flat grid with no spatial ordering, making it hard to spot trends or gradients
across the sample.

## Expected Behavior

A new "Movie" view mode (or a play button within the Sample Comparison view)
that:

1. Selects a specific sample (IGSN) and instrument
2. Stacks all visualizations from different measurement positions for that
   sample in position order
3. Animates through them sequentially, like a flipbook/movie
4. Shows the current position identifier and a position indicator (e.g., a
   progress bar or position index like "3 / 12")
5. Has play/pause, forward/back controls, and adjustable speed

This lets researchers see spatial variation across a sample — for example,
how XRD patterns change from one edge of a sample to the other, or how
nanoindentation response varies across a composition gradient.

## Implementation Approach

### Backend
- Add a `position` field to visualization items (initially extracted from
  folder names; later from Girder item metadata when coordinate data is added)
- Add an endpoint `GET /api/visualizations/sample/{igsn}` that returns all
  visualizations for a sample, sorted by position
- For MAXIMA, position is encoded in the folder name (e.g., `0_765` in
  `JHXMAL00005_..._0_765_2026-03-23_...`)

### Frontend
1. Add a "Movie" view mode to `ViewModeSelector` (icon: ▶)
2. Create a new `MovieView.jsx` component:
   - Sample/IGSN selector dropdown (populated from available data)
   - Instrument selector (if the sample has data from multiple instruments)
   - Large centered image display area
   - Playback controls: ⏮ ◀ ▶/⏸ ▶ ⏭
   - Speed slider (0.5x, 1x, 2x, 4x)
   - Position indicator / scrubber bar
   - Current position metadata overlay (position ID, timestamp)
3. Use `setInterval` with the current speed for auto-play; step through
   the sorted position array
4. Support keyboard shortcuts: Space (play/pause), Left/Right (step),
   Up/Down (speed)

### Future Enhancement
When sample position coordinates are available as metadata, overlay a small
sample map showing which position is currently being displayed, with a dot
or crosshair at the current location.

## Labels

`enhancement`, `frontend`, `backend`, `feature-request`
