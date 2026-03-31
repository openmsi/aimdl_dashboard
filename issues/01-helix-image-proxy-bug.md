# Issue #1: HELIX visualization PNGs fail to render — image proxy limit bug

## Problem

HELIX visualization PNGs show broken image icons in the dashboard while MAXIMA
images render correctly. The browser shows the alt text (filename) instead of
the image.

![Screenshot showing broken HELIX images](../docs/helix-broken-images.png)

## Root Cause

In `backend/src/aimdl_dashboard_api/app.py`, the `get_visualization_image`
endpoint calls `get_cached_visualizations()` with no arguments:

```python
@app.get("/api/visualizations/{item_id}/image")
def get_visualization_image(item_id: str):
    ...
    items = get_cached_visualizations()  # defaults to limit=30
    viz = next((v for v in items if v["id"] == item_id), None)
```

`get_cached_visualizations()` defaults to `limit=30` and returns items sorted
newest-first. The cache contains 60 items (30 HELIX + 30 MAXIMA). Since HELIX
items are older, they sort into positions 31–60 and are excluded by the limit.
The proxy then can't find the HELIX item by ID and returns 404.

## Fix

The image proxy should search ALL cached items, not a limited subset. Two approaches:

**Option A (minimal):** Pass a large limit or remove the limit in the image proxy call:
```python
items = get_cached_visualizations(limit=9999)
```

**Option B (better):** Add a `get_cached_viz_by_id(item_id)` function to
`discovery.py` that does a direct dict lookup instead of filtering a list:
```python
def get_cached_viz_by_id(item_id):
    return _cache_index.get(item_id)
```
Build `_cache_index` as a `{id: viz_dict}` map during `refresh_cache()`.

## Labels

`bug`, `backend`, `priority-high`
