# Issue: Configurable data scale and manual refresh

**Branch:** `feat/configurable-data-scale`

Read CLAUDE.md for project context. Then read all backend and frontend source
files to understand the current data flow. The current architecture has three
stacked hard limits that cap the dashboard at ~60 visualizations:

1. Backend `discovery.py` `refresh_cache()` caps at `per_instrument_limit=30`
2. Backend `app.py` `/api/visualizations` default limit is 30, max 200
3. Frontend `useVizStream.js` hardcodes `limit=60`

We want to make the dashboard more flexible. Implement these changes:

## Backend changes

### 1. Add a manual refresh endpoint

In `app.py`, add:

```
POST /api/refresh
```

This triggers an immediate `refresh_cache()` and returns `{"status": "ok",
"total": N}`. No authentication needed for now (local use only).

### 2. Make discovery limits configurable

In `config.py`, add:

```python
PER_INSTRUMENT_LIMIT = int(os.environ.get("PER_INSTRUMENT_LIMIT", "50"))
```

Use this in `discovery.py` instead of the hardcoded `per_instrument_limit=30`
in `refresh_cache()`. Also increase the folder walk limits in
`_discover_helix` and `_discover_maxima`:
- IGSN/experiment folders: increase from 50 to 200
- Shot/sub folders: increase from 50 to 100
- Items per folder: increase from 20 to 50

### 3. Raise the API max limit

In `app.py`, change the `limit` parameter on `/api/visualizations` from
`le=200` to `le=1000`.

### 4. Accept a limit parameter on refresh

Change `/api/refresh` to accept an optional query parameter:

```
POST /api/refresh?per_instrument=100
```

which overrides `PER_INSTRUMENT_LIMIT` for that one refresh. This lets the
frontend request a deeper scan without restarting the backend.

## Frontend changes

### 5. Add a control bar below the ThroughputHero

Create a new component `DataControls.jsx` that renders a horizontal bar with:

- A "Refresh" button that POSTs to `/api/refresh` and then re-fetches
  visualizations. Show a brief spinner or "Refreshing..." state.
- A dropdown or slider for "Show: 30 / 60 / 120 / 250 / 500" that controls
  how many visualizations to request. Store the selected value in React state
  and pass it to `useVizStream` as the limit.
- A small text label showing "Last updated: Xs ago" that updates every second.

Style it to match the existing dark dashboard aesthetic: dark background,
IBM Plex Mono font, subtle borders, compact layout. It should feel like part
of the status bar, not a heavy UI element.

### 6. Make useVizStream accept a configurable limit

Change `useVizStream.js` so the hardcoded `limit=60` becomes a parameter:

```javascript
export default function useVizStream({ filter, pollIntervalMs, limit = 60 } = {})
```

Use `limit` in the fetch URL instead of the hardcoded "60".

### 7. Wire DataControls into Dashboard.jsx

Add `DataControls` between `ThroughputHero` and the instrument tabs. Pass
it a callback for refresh and a state setter for the limit. When the user
changes the limit, `useVizStream` should re-fetch with the new value.

### 8. Add a keyboard shortcut

Add `r` as a keyboard shortcut to trigger refresh (when no input is focused).
This is convenient for kiosk/demo use.

## Testing

- Verify the backend starts and `/api/refresh` returns a count
- Verify changing the dropdown to 250 loads more data (if available in Girder)
- Verify the refresh button triggers an immediate update
- Run any existing backend tests if present

## Important constraints

- Python 3.9 compatible (use `Optional[str]` not `str | None`, etc.)
- Do NOT break the existing mock mode (`?mock=true`)
- Keep the periodic auto-refresh (every 30s) running alongside the manual refresh
- The DataControls bar should be visually minimal — this is a kiosk dashboard
