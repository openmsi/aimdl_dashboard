# Issue: Refactor discovery to use /aimdl API instead of folder walking

**Branch:** `refactor/aimdl-api-discovery`

## Context

The current `discovery.py` walks the Girder folder tree to find visualization
PNGs (50+ HTTP calls, ~30 seconds per refresh). The Girder instance at
data.htmdec.org has an `/aimdl` REST endpoint (from the girder-jsonforms
plugin) that queries MongoDB directly. Every PNG item has metadata fields
including `meta.igsn` and `meta.data_type`, so we can find all visualizations
with a single query per data type.

### Available /aimdl endpoints

1. **`GET /aimdl/count`** (PUBLIC, no auth needed) — MongoDB aggregation that
   returns file counts per data_type in one call:
   ```json
   {
     "pdv_alpss_output": 12300,
     "xrd_derived": 15560,
     "xrd_raw": 16080,
     "xrf_raw": 6932,
     ...
   }
   ```

2. **`GET /aimdl/datafiles?dataType=xxx&limit=100&offset=0&sort=created&sortdir=-1`**
   (requires auth) — returns items with fields: `_id`, `name`, `meta.igsn`,
   `meta.data_type`, `size`, `created`, `folderId`. Caps at 100 per call;
   paginate with `offset`.

3. **`GET /aimdl/datatype`** (requires auth) — returns distinct data_type values.

### Data type mapping

The PNG visualizations for the dashboard come from:
- `pdv_alpss_output` → HELIX (12,300 ALPSS analysis plots)
- `xrd_derived` → MAXIMA (15,560 processed XRD patterns)

Other types are raw data or metadata, not PNGs for display:
- `pdv_trace`, `xrd_raw`, `xrf_raw` — raw instrument data
- `xrd_metadata`, `pdv_experiment_log` — metadata/logs
- `xrd_calibrant_derived`, `xrd_calibrant_raw` — calibration files

### Item metadata fields (from Girder screenshot)

Each PNG item has these metadata keys:
- `igsn`: e.g. "JHAMAB00019-12"
- `dataflowId`: links to OpenMSIStream dataflow
- `runId`: experiment run UUID
- `specId`: links to form entry
- `prov`: `{"wasDerivedFrom": "...", "wasGeneratedBy": "amdee_xrd-0.1.4"}`

## Read these files first

Read CLAUDE.md, then read ALL files in `backend/src/aimdl_dashboard_api/`
to understand the current architecture. Also read `frontend/src/hooks/useVizStream.js`,
`frontend/src/config.js`, and `frontend/src/components/ThroughputHero.jsx`.

## Backend changes

### 1. Replace folder-walking discovery with /aimdl API queries

Rewrite `discovery.py` completely. Remove `_discover_helix()`,
`_discover_maxima()`, `resolve_instrument_folders()`, and all the folder
walking code. Replace with:

```python
DATATYPE_TO_INSTRUMENT = {
    "pdv_alpss_output": "HELIX",
    "xrd_derived": "MAXIMA",
}

VIZ_DATATYPES = list(DATATYPE_TO_INSTRUMENT.keys())
```

The new `refresh_cache(per_instrument_limit=100)` should:
1. For each data type in VIZ_DATATYPES, call the Girder REST API:
   `client.get("aimdl/datafiles", parameters={"dataType": dt, "limit": 100, "offset": 0, "sort": "created", "sortdir": -1})`
2. If `per_instrument_limit > 100`, paginate with increasing offset
3. For each returned item, build the visualization dict:
   - `id`: item `_id`
   - `name`: item `name`
   - `instrument`: from DATATYPE_TO_INSTRUMENT
   - `igsn`: item `meta.igsn`
   - `sample`: item `meta.igsn`
   - `folder_path`: construct as `"{instrument} / {igsn}"`
   - `created`: item `created`
   - `file_id`: call `client.get(f"item/{item_id}/files")[0]["_id"]`
     (batch after collecting all items; reuse cached file_ids)
   - `metadata`: item `meta` dict
   - `pair_key` and `pair_role`: extract from filename for MAXIMA
     (filename ending in `_scan.png` → role="scan", `_xrd.png` → role="xrd")
   - `position`: extract from filename or metadata if available
4. Sort all results by created date descending
5. Store in cache as before

### 2. Add /aimdl/count for authoritative totals

Add a method to `girder_client.py`:
```python
def get_aimdl_counts(self):
    """Get file counts per data type. Public endpoint, no auth needed."""
    return self.client.get("aimdl/count")
```

Store the counts in the cache alongside the visualization items. Expose
them via a new endpoint:

```python
@app.get("/api/counts")
def get_counts():
    return _cache.get("counts", {})
```

This gives the ThroughputHero access to authoritative totals (12,300 HELIX
files, 15,560 MAXIMA files) without needing the stream counter running.

### 3. Feed counts to the ThroughputHero

The `/api/counts` response should be shaped to match what ThroughputHero
expects:
```json
{
  "total_files": 27860,
  "by_instrument": {
    "HELIX": {"files": 12300},
    "MAXIMA": {"files": 15560},
    "SPHINX": {"files": 0}
  },
  "source": "girder"
}
```

### 4. Make per_instrument_limit configurable

In `config.py`, add:
```python
PER_INSTRUMENT_LIMIT = int(os.environ.get("PER_INSTRUMENT_LIMIT", "100"))
```

### 5. Add manual refresh endpoint

Add `POST /api/refresh` to `app.py` that triggers immediate `refresh_cache()`
and returns `{"status": "ok", "total": N}`.

### 6. Update girder_client.py

Add methods for the aimdl endpoints:
```python
def get_aimdl_datafiles(self, data_type, limit=100, offset=0, sort="created", sortdir=-1):
    return self.client.get("aimdl/datafiles", parameters={...})

def get_aimdl_counts(self):
    """Public endpoint — works even without auth."""
    import requests
    from .config import GIRDER_API_URL
    resp = requests.get(f"{GIRDER_API_URL}/aimdl/count")
    resp.raise_for_status()
    return resp.json()
```

Note: `/aimdl/count` is `@access.public` so it doesn't need the authenticated
girder_client. Use a plain `requests.get` for it so it works even if Girder
auth fails.

### 7. Remove resolve_instrument_folders() from startup

In `app.py` lifespan, simplify to:
```python
girder.connect()
refresh_cache()
```

No more `resolve_instrument_folders()`.

## Frontend changes

### 8. Update ThroughputHero to use /api/counts as fallback

When the stream counter at port 8001 is not running, ThroughputHero currently
shows zeros. Change it to fall back to the dashboard backend's `/api/counts`
endpoint (port 8000) for authoritative Girder-sourced totals. The priority
should be:
1. SSE from stream counter (real-time)
2. Polling stream counter /api/dashboard/hero (near-real-time)
3. Polling dashboard backend /api/counts (authoritative but not real-time)

This means the hero always shows real numbers even without the stream counter.

### 9. Add DataControls component

Create `DataControls.jsx` — a compact horizontal bar with:
- A "Refresh" button that POSTs to `/api/refresh` then re-fetches
- A dropdown for "Show: 30 / 60 / 120 / 250 / 500" items
- "Last updated: Xs ago" label
- Total item counts from `/api/counts` displayed as small text

Style to match dark kiosk aesthetic (IBM Plex Mono, dark bg, subtle borders).

Wire into `Dashboard.jsx` between ThroughputHero and instrument tabs.

### 10. Make useVizStream limit configurable

Change hardcoded `limit=60` to accept a parameter:
```javascript
export default function useVizStream({ filter, pollIntervalMs, limit = 60 } = {})
```

### 11. Add keyboard shortcut

Press `r` to trigger refresh (when no input element is focused).

## Important constraints

- Python 3.9 compatible — use `Optional[str]` not `str | None`, use
  `Dict`, `List` from typing, include `from __future__ import annotations`
- Do NOT break mock mode (`?mock=true`)
- Keep periodic auto-refresh (every 30s) running alongside manual refresh
- The `/aimdl/datafiles` endpoint requires auth (existing Girder client
  handles this). The `/aimdl/count` endpoint is public.
- The `/aimdl/datafiles` endpoint caps at 100 items per request — paginate
  with offset if PER_INSTRUMENT_LIMIT > 100
- Style DataControls to match the dark kiosk aesthetic

## Testing

- Verify backend starts and `/api/health` returns ok
- Verify `/api/visualizations` returns items from /aimdl queries
- Verify `/api/counts` returns instrument totals
- Verify `/api/refresh` triggers a new cache load
- Verify ThroughputHero shows real counts even without stream counter
- Verify frontend refresh button and limit dropdown work
- Verify `r` keyboard shortcut triggers refresh
