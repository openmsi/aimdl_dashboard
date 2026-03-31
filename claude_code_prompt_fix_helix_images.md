# Claude Code Prompt: Fix HELIX image proxy limit bug

**Read CLAUDE.md first.** Then read `issues/01-helix-image-proxy-bug.md` for
full context on this bug.

## GitHub Issue

Create the issue first (skip if it already exists):

```bash
gh issue create \
  --title "bug: HELIX visualization PNGs fail to render — image proxy limit bug" \
  --body-file issues/01-helix-image-proxy-bug.md \
  --label "bug"
```

Note the issue number returned (e.g., `#1`). Use it in the PR later.

## Branch

```bash
git checkout main
git pull
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

### Step 3: Commit and push

```bash
git add -A
git commit -m "fix: resolve HELIX image proxy 404 due to cache limit bug

The image proxy endpoint called get_cached_visualizations() with default
limit=30. Since HELIX items are older than MAXIMA items, they sorted into
positions 31-60 and were invisible to the proxy lookup. Added a _cache_by_id
dict index for O(1) item lookup by ID.

Closes #ISSUE_NUMBER"
git push -u origin fix/helix-image-proxy
```

### Step 4: Create PR

```bash
gh pr create \
  --title "fix: resolve HELIX image proxy 404 due to cache limit bug" \
  --body "## Summary

The image proxy endpoint called \`get_cached_visualizations()\` with a default
limit of 30. HELIX items (older timestamps) sorted beyond position 30 and
returned 404 when the proxy tried to look them up, causing broken images.

## Changes

- Added \`_cache_by_id\` dict index to \`discovery.py\` for O(1) lookup
- Added \`get_cached_viz_by_id()\` function
- Updated image proxy endpoint to use direct ID lookup

## Testing

- HELIX image proxy returns 200 with PNG bytes
- MAXIMA image proxy still works
- No regressions in list endpoint

Closes #ISSUE_NUMBER" \
  --base main
```

Replace `#ISSUE_NUMBER` with the actual number from Step 1.

## Verification Checklist

- [ ] GitHub issue created
- [ ] `get_cached_viz_by_id` function exists in discovery.py
- [ ] `_cache_by_id` is populated during `refresh_cache()`
- [ ] Image proxy uses `get_cached_viz_by_id` instead of `get_cached_visualizations`
- [ ] HELIX image proxy returns 200 with PNG bytes
- [ ] MAXIMA image proxy still works
- [ ] No regressions in `/api/visualizations` list endpoint
- [ ] Branch pushed, PR created and linked to issue
