# Issue #2: Keep MAXIMA scan/xrd PNG pairs side by side

## Problem

MAXIMA data processing produces natural pairs of PNGs for each measurement point:
one with `_scan.png` and one with `_xrd.png` in the filename. These are the same
measurement visualized two ways (e.g., a 2D detector scan image and the integrated
XRD pattern). Currently they appear in arbitrary order in the grid, separated by
other visualizations.

## Expected Behavior

When viewing MAXIMA visualizations, each scan/xrd pair should appear adjacent in
the grid — scan on the left, xrd on the right — so a researcher can compare them
at a glance. The pairing key is the filename with `_scan` or `_xrd` replaced by
a common stem.

## Example

Files that should be paired:
```
JHXMAL00005_69c15fbb..._0_765_2026-03-23_15-59-06_scan.png
JHXMAL00005_69c15fbb..._0_765_2026-03-23_15-59-06_xrd.png
```

Common stem: `JHXMAL00005_69c15fbb..._0_765_2026-03-23_15-59-06`

## Implementation Approach

**Backend:** In `discovery.py`, after discovering MAXIMA items, identify pairs by
extracting the filename stem (everything before `_scan.png` or `_xrd.png`). Add a
`pair_key` field to each viz dict, and a `pair_role` field (`scan` or `xrd`).
Sort results so paired items are adjacent, with `scan` before `xrd`.

**Frontend:** In `StreamView.jsx`, when MAXIMA items have `pair_key` metadata,
render paired items in a two-column sub-grid within a single card or in a
side-by-side layout so they visually read as a unit.

## Labels

`enhancement`, `backend`, `frontend`
