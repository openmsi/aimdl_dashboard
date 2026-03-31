# Issue #3: Add zoom control for dynamic image scaling

## Problem

The current grid layout uses a fixed `minmax(280px, 1fr)` column width. When
viewing dense data or detailed plots, users may want to see fewer, larger images
or more, smaller images. There is no way to adjust the image size.

## Expected Behavior

A zoom slider or +/- control in the toolbar allows the user to dynamically adjust
how many columns of images appear. Sliding toward "larger" reduces columns (e.g.,
2 across for detailed inspection); sliding toward "smaller" increases columns
(e.g., 6+ across for overview/scanning). The grid reflows smoothly as the slider
moves.

## Implementation Approach

**Frontend only — no backend changes.**

1. Add a `zoom` state (integer, e.g., 1–5, default 3) to `Dashboard.jsx`.
2. Map zoom levels to `minmax` values:
   - Level 1: `minmax(500px, 1fr)` — large, ~2 columns
   - Level 2: `minmax(380px, 1fr)` — ~3 columns
   - Level 3: `minmax(280px, 1fr)` — current default, ~4 columns
   - Level 4: `minmax(200px, 1fr)` — ~5 columns
   - Level 5: `minmax(150px, 1fr)` — ~6+ columns, thumbnail overview
3. Add a compact zoom control to the header bar (next to ViewModeSelector):
   - A small slider or a pair of magnifying glass +/- buttons
   - Show current zoom level indicator
4. Pass the computed `minmax` value as a prop to `StreamView.jsx` and update
   the grid-template-columns style.
5. Persist zoom level in a URL parameter `?zoom=N` so kiosk configurations
   can specify a zoom level.

## Notes

- This affects Stream view and potentially Sample Comparison view.
- Spotlight view is not affected (it has its own fixed layout).
- In kiosk mode (`?kiosk=true`), the zoom control should still be visible
  since operators may want to adjust it.

## Labels

`enhancement`, `frontend`
