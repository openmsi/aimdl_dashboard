# Step D: Documentation — update READMEs for per-instrument balance

**Branch:** `feat/per-instrument-balance` (continue from Step C)

## Context

Steps A–C implemented per-instrument balanced display in the backend and
frontend. This step updates the documentation to reflect the new controls,
API parameters, and environment variables. No code changes.

## Read these files first

- `README.md` (top-level)
- `backend/README.md`
- `backend/src/aimdl_dashboard_api/config.py` (to verify env var names)
- `backend/src/aimdl_dashboard_api/app.py` (to verify endpoint signatures)

Do NOT read frontend files or discovery.py — they are done.

## Task 1: Update top-level README.md

Make these specific edits. Do not rewrite surrounding paragraphs — change
only what's listed below.

### 1a. "Dashboard Controls" section

Find the bullet that starts with **"Show dropdown"** and replace it with:

```markdown
**Per instrument dropdown** (15 / 30 / 60 / 125 / 250) — controls how
many visualization PNGs to display from each instrument. Selecting 30
returns up to 30 HELIX and 30 MAXIMA items, guaranteeing balanced
representation regardless of which instrument produced data most recently.

**Fetch depth dropdown** (100 / 250 / 500 / 1000) — controls how many
items per instrument the backend fetches from Girder on the next refresh.
Higher values pull more historical data into the cache. Takes effect when
the Refresh button is clicked; does not require a container restart.
```

### 1b. "Backend API" table

Update the `/api/visualizations` row. Change the Description column from:
```
Cached PNGs (`?instrument=`, `?igsn=`, `?limit=`, `?since=`)
```
to:
```
Cached PNGs (`?instrument=`, `?igsn=`, `?per_instrument=`, `?limit=`, `?since=`)
```

Update the `/api/refresh` row. Change the Description column from:
```
Trigger immediate cache refresh
```
to:
```
Trigger cache refresh (optional body: `{"per_instrument_limit": N}`)
```

### 1c. "Environment Variables" table

Add a row after `PER_INSTRUMENT_LIMIT`:

```
| `DEFAULT_PER_INSTRUMENT` | No | `30` | Dashboard backend (items served per instrument in API response) |
```

### 1d. "How the backend finds data" section

After the paragraph ending with "The cache refreshes automatically every
30 seconds, or on demand via the refresh button.", add:

```markdown
The API serves items **balanced per instrument** when the `per_instrument`
query parameter is used: requesting `per_instrument=30` returns up to 30
from each active instrument regardless of which produced data most
recently. The legacy `limit` parameter (global cap across all instruments)
is still supported for backward compatibility. The fetch depth — how many
items per instrument are cached — can be adjusted at runtime via the
refresh endpoint's `per_instrument_limit` body parameter without
restarting the container.
```

## Task 2: Update backend README.md

### 2a. Environment variables table

The current table has two rows (`AIMDL_API_KEY` and `GIRDER_API_URL`).
Add two more rows:

```
| `PER_INSTRUMENT_LIMIT`   | No       | `100` | Items fetched per data type from Girder on cache refresh |
| `DEFAULT_PER_INSTRUMENT` | No       | `30`  | Items returned per instrument in API responses           |
```

## Verification

After making edits, visually scan both READMEs to confirm:
- No broken markdown table alignment
- No orphaned backticks or unclosed formatting
- The new text is consistent with the existing writing style (concise,
  technical, no marketing language)

```bash
# Quick check: grep for the new terms to confirm they're present
grep -n "per_instrument" README.md
grep -n "per_instrument" backend/README.md
grep -n "DEFAULT_PER_INSTRUMENT" README.md
grep -n "DEFAULT_PER_INSTRUMENT" backend/README.md
grep -n "fetch depth" README.md
```

Each grep should return at least one match.

## Constraints

- Do NOT modify any Python or JavaScript files
- Do NOT rewrite or restructure existing README sections — only add or
  replace the specific items listed above
- Preserve existing markdown table column widths where possible
- Commit message: `"docs: document per-instrument balance controls and API parameters"`
