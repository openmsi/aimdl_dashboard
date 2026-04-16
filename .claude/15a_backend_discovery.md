# Step A: Backend — test fixtures and per-instrument balanced cache

**Branch:** `feat/per-instrument-balance`

## Context

The dashboard has a display balance bug: the frontend asks for a global
`limit` of 60 from the merged, date-sorted cache, so a burst of HELIX
runs can push all MAXIMA items off the end. This step adds the backend
foundation: test fixtures (which the existing conftest.py references but
which don't exist), the balanced `per_instrument` retrieval mode in
`discovery.py`, and tests that prove it works.

No app.py, frontend, or README changes in this step.

## Read these files first

- `backend/src/aimdl_dashboard_api/discovery.py`
- `backend/src/aimdl_dashboard_api/config.py`
- `backend/src/aimdl_dashboard_api/girder_client.py`
- `backend/tests/conftest.py`
- `backend/tests/test_girder_client.py`

## Task 1: Create test fixtures

The existing `conftest.py` loads fixtures from `backend/tests/fixtures/`
but that directory does not exist. Create it with four JSON files.

**`backend/tests/fixtures/mock_datafiles_helix.json`** — JSON array of
5 Girder items representing HELIX visualizations:
- `"_id"`: `"helix_item_001"` through `"helix_item_005"`
- `"name"`: `.png` filenames using HELIX naming convention (e.g.,
  `"JHAMAL00016-002_shot05_ch1-iq.png"`)
- `"meta"`: `{ "igsn": "<igsn>", "data_type": "pdv_alpss_output" }`
- `"created"`: ISO 8601 timestamps spaced one hour apart, starting
  from `"2026-04-13T22:00:00+00:00"` (newest) down to
  `"2026-04-13T18:00:00+00:00"` (oldest)
- Use two distinct IGSNs (e.g., 3 items with `JHAMAL00016-002`,
  2 items with `JHAMAL00017-001`)

**`backend/tests/fixtures/mock_datafiles_maxima.json`** — JSON array of
5 MAXIMA items:
- `"_id"`: `"maxima_item_001"` through `"maxima_item_005"`
- `"name"`: MAXIMA-style names with `_xrd.png` or `_scan.png` suffixes
  and position tokens (e.g., `"JHXMAL00005_0_765_xrd.png"`,
  `"JHXMAL00005_0_765_scan.png"`)
- `"meta"`: `{ "igsn": "JHXMAL00005", "data_type": "xrd_derived" }`
- `"created"`: timestamps **interleaved** with the HELIX ones — some
  newer, some older than the HELIX items. This is critical: if all
  MAXIMA items are older, the balance test doesn't prove anything.
  Example interleaving:
  - HELIX 22:00, **MAXIMA 21:30**, HELIX 21:00, **MAXIMA 20:30**,
    HELIX 20:00, **MAXIMA 19:30**, HELIX 19:00, **MAXIMA 18:30**,
    HELIX 18:00, **MAXIMA 17:30**

**`backend/tests/fixtures/mock_counts.json`**:
```json
{ "pdv_alpss_output": 500, "xrd_derived": 300 }
```

**`backend/tests/fixtures/mock_item_files.json`**:
```json
[{ "_id": "file_test_001" }]
```

## Task 2: Add `per_instrument` mode to `get_cached_visualizations`

In `backend/src/aimdl_dashboard_api/discovery.py`:

**Change the signature** of `get_cached_visualizations` from:
```python
def get_cached_visualizations(instrument=None, igsn=None, limit=30, since=None):
```
to:
```python
def get_cached_visualizations(instrument=None, igsn=None, limit=30,
                               per_instrument=None, since=None):
```

**Add the balanced mode** at the top of the function body, before the
existing code. When `per_instrument is not None`:
1. Apply `igsn` and `since` filters to the full cache (same as existing)
2. Group remaining items by `v["instrument"]`
3. If `instrument` filter is set, only keep that instrument's group
4. Take the first `per_instrument` items from each group (the cache is
   already sorted by `created` desc, so `[:N]` = most recent N)
5. Merge all groups and sort by `created` desc
6. Return the merged list

When `per_instrument is None`, the existing code path must be **completely
unchanged** — do not restructure or reformat it.

## Task 3: Add `DEFAULT_PER_INSTRUMENT` to config.py

In `backend/src/aimdl_dashboard_api/config.py`, add:

```python
DEFAULT_PER_INSTRUMENT = int(os.environ.get("DEFAULT_PER_INSTRUMENT", "30"))
```

Do not modify any existing config values.

## Task 4: Create `backend/tests/test_discovery.py`

Write these test functions, all using the `mock_girder` fixture from
conftest.py. Each test must call `refresh_cache()` first to populate the
cache from the mock, then call `get_cached_visualizations` with various
arguments.

```python
from aimdl_dashboard_api.discovery import refresh_cache, get_cached_visualizations
```

1. **`test_refresh_cache_populates_both_instruments`** — refresh, then
   get all items with `limit=100`. Assert items from both HELIX and
   MAXIMA are present. Assert total count matches expected (should be
   10 total: 5 HELIX PNGs + 5 MAXIMA PNGs).

2. **`test_per_instrument_balances_instruments`** — refresh, then call
   `get_cached_visualizations(per_instrument=2)`. Assert the result
   contains exactly 2 HELIX items and 2 MAXIMA items (4 total). This
   is the key test: it proves that even if HELIX has newer items, both
   instruments get equal representation.

3. **`test_per_instrument_with_instrument_filter`** — call with
   `per_instrument=3, instrument="MAXIMA"`. Assert only MAXIMA items
   are returned, up to 3.

4. **`test_global_limit_unchanged`** — call with `limit=3` (no
   `per_instrument`). Assert it returns exactly 3 items, sorted by
   date regardless of instrument. This confirms backward compatibility.

5. **`test_per_instrument_with_igsn_filter`** — call with both
   `per_instrument=10` and `igsn` set to one of the HELIX IGSNs.
   Assert only items matching that IGSN are returned.

6. **`test_per_instrument_exceeds_available`** — call with
   `per_instrument=100`. Assert it returns all cached items (not an
   error), just capped at what's available per instrument.

## Verification

Run from the `backend/` directory:

```bash
python -c "import ast; ast.parse(open('src/aimdl_dashboard_api/discovery.py').read()); ast.parse(open('src/aimdl_dashboard_api/config.py').read()); print('Parse OK')"
python -m pytest tests/test_discovery.py -v
python -m pytest tests/ -v
```

All tests must pass, including the existing `test_girder_client.py` tests.

## Constraints

- Python 3.9 compatible — use `Optional[int]` not `int | None`
- Do NOT modify `app.py`, any frontend files, or any README files
- Do NOT modify the existing code path in `get_cached_visualizations`
  when `per_instrument is None` — leave it exactly as-is
- Do NOT modify `conftest.py` — the fixture loading code is already
  correct; you're creating the files it expects
- Commit message: `"feat(discovery): add per-instrument balanced cache retrieval and test fixtures"`
