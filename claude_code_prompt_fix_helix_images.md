# Claude Code Prompt: Fix HELIX image proxy limit bug

**Read CLAUDE.md first.** Then read `issues/01-helix-image-proxy-bug.md` for
full context on this bug.

## Branch

```bash
git checkout -b fix/helix-image-proxy
```

## Problem

The image proxy endpoint at `GET /api/visualizations/{item_id}/image` in
`backend/src/aimdl_dashboard_api/app.py` calls `get_cached_visualizations()`
with no arguments. That function defaults to `limit=30` and returns items
sorted newest-first. The cache has 60 items (30 HELIX + 30 MAXIMA). Because
HELIX items are older, they sort into positions 31–60 and are excluded by
the limit. The proxy returns 404 for all HELIX items, causing broken images
in the frontend.

## Fix

### Step 1: Add an ID-indexed cache to discovery.py

In `backend/src/aimdl_dashboard_api/discovery.py`:

1. Add `_cache_by_id = {}` at module level alongside the existing `_cache` dict.

2. In `refresh_cache()`, after building `all_items`, populate the index:
   ```python
   _cache_by_id.clear()
   for item in all_items:
       _cache_by_id[item["id"]] = item
   ```

3. Add a new function:
   ```python
   def get_cached_viz_by_id(item_id):
       """Look up a single visualization by Girder item ID. O(1)."""
       return _cache_by_id.get(item_id)
   ```

4. Export `get_cached_viz_by_id` (add it to any existing `__all__` or just
   make sure the import in app.py works).

### Step 2: Update the image proxy endpoint in app.py

In `backend/src/aimdl_dashboard_api/app.py`:

1. Import `get_cached_viz_by_id` from `.discovery`.

2. Replace the image endpoint's lookup logic:

   **Before:**
   ```python
   items = get_cached_visualizations()
   viz = next((v for v in items if v["id"] == item_id), None)
   if not viz:
       raise HTTPException(404, "Visualization not found")
   ```

   **After:**
   ```python
   viz = get_cached_viz_by_id(item_id)
   if not viz:
       raise HTTPException(404, "Visualization not found in cache")
   ```

### Step 3: Verify

1. Start the backend with `AIMDL_API_KEY` set.
2. Wait for cache refresh to complete (check logs).
3. From the log output, pick a HELIX item ID.
4. Verify `curl http://localhost:8000/api/visualizations/{helix_item_id}/image`
   returns PNG bytes (check with `file -` or `| head -c 8 | xxd`).
5. Verify a MAXIMA item ID also works.
6. Start the frontend — HELIX images should now render.

## Verification Checklist

- [ ] `get_cached_viz_by_id` function exists in discovery.py
- [ ] `_cache_by_id` is populated during `refresh_cache()`
- [ ] Image proxy uses `get_cached_viz_by_id` instead of `get_cached_visualizations`
- [ ] HELIX image proxy returns 200 with PNG bytes
- [ ] MAXIMA image proxy still works
- [ ] No regressions in `/api/visualizations` list endpoint
- [ ] Commit message: "fix: resolve HELIX image proxy 404 due to cache limit bug"
