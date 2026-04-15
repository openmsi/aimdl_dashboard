# Step C: Frontend — per-instrument controls and test updates

**Branch:** `feat/per-instrument-balance` (continue from Step B)

## Context

Steps A and B added the backend `per_instrument` query parameter and
`POST /api/refresh` body support. This step updates the frontend to use
them: the data hook switches from a global `limit` to `per_instrument`,
the DataControls component gets renamed semantics and a fetch-depth
control, and the tests are updated to match.

No backend or README changes in this step.

## Read these files first

- `frontend/src/hooks/useVizStream.js`
- `frontend/src/hooks/__tests__/useVizStream.test.js`
- `frontend/src/components/Dashboard.jsx`
- `frontend/src/components/DataControls.jsx`
- `frontend/src/components/__tests__/DataControls.test.jsx`
- `frontend/src/config.js`

Do NOT read backend files — they are done.

## Task 1: Update useVizStream.js

**Change the hook signature** from:
```javascript
useVizStream({ filter = "ALL", pollIntervalMs, limit = 60 } = {})
```
to:
```javascript
useVizStream({ filter = "ALL", pollIntervalMs, perInstrument = 30 } = {})
```

**Change the fetch URL** from:
```javascript
const url = `${API_CONFIG.baseUrl}/visualizations?limit=${encodeURIComponent(String(limit))}`;
```
to:
```javascript
const url = `${API_CONFIG.baseUrl}/visualizations?per_instrument=${encodeURIComponent(String(perInstrument))}`;
```

**Update the `useCallback` dependency array** — replace `limit` with
`perInstrument`.

Everything else in the hook stays the same: mock fallback, polling,
`mapApiViz`, filter logic, counts computation.

## Task 2: Update DataControls.jsx

Three changes to this component:

### 2a. Rename the "Show" dropdown

Change the label text from `"Show"` to `"Per instrument"`.

Change `LIMIT_OPTIONS` from `[30, 60, 120, 250, 500]` to
`[15, 30, 60, 125, 250]`. These are per-instrument values now (so "30"
means 30 HELIX + 30 MAXIMA = ~60 displayed total).

The props stay the same: `limit`, `setLimit`. The prop names are internal
wiring — only the user-facing label changes.

### 2b. Add a fetch-depth dropdown

Add local state:
```javascript
const [fetchDepth, setFetchDepth] = useState(100);
```

Add a new `<select>` element after the Refresh button and before the
"Per instrument" dropdown. Options: `[100, 250, 500, 1000]`. Label:
`"Fetch"`. Use the same select styling as the existing dropdown.

### 2c. Send fetch depth in the refresh POST body

Update `handleRefresh` to send the fetch depth:

```javascript
await fetch(`${API_CONFIG.baseUrl}/refresh`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ per_instrument_limit: fetchDepth }),
});
```

The layout order should be:
`[Refresh [R]] [Fetch ▾100] [Per instrument ▾30] [Last updated: Xs ago] ... [counts]`

## Task 3: Update Dashboard.jsx

Change the `useVizStream` call from:
```javascript
const { data, filtered, counts, lastUpdate, refetch } = useVizStream({ filter, limit });
```
to:
```javascript
const { data, filtered, counts, lastUpdate, refetch } = useVizStream({ filter, perInstrument: limit });
```

This maps the existing `limit` state variable (controlled by the "Per
instrument" dropdown via `setLimit`) to the hook's `perInstrument`
parameter. The state variable name `limit` is fine internally — the
important thing is that it passes to the hook as `perInstrument`.

Alternatively, rename the state from `[limit, setLimit]` to
`[perInstrument, setPerInstrument]` and update all references in
Dashboard.jsx. Either approach is fine — pick whichever produces a
smaller diff.

## Task 4: Update useVizStream.test.js

Update the existing tests:

- **"respects limit parameter in fetch URL"** → rename to "respects
  perInstrument parameter in fetch URL". Change the hook call from
  `useVizStream({ limit: 250 })` to `useVizStream({ perInstrument: 250 })`.
  Change the URL assertion from `expect(url).toContain('limit=250')` to
  `expect(url).toContain('per_instrument=250')`.

- **All other tests** that pass `limit:` to the hook → change to
  `perInstrument:`.

Add one new test:

- **"defaults to per_instrument=30"** — render the hook with no args
  (`useVizStream()`), wait for fetch, verify the URL contains
  `per_instrument=30`.

## Task 5: Update DataControls.test.jsx

Update existing tests:

- **"renders refresh button, limit dropdown, and last updated"** — the
  combobox should still exist. Additionally, check that the label "Per
  instrument" appears (not "Show"). Optionally check for the fetch-depth
  select (there will now be two `<select>` elements or two comboboxes).

- **"clicking refresh button calls POST /api/refresh"** — update the
  mock assertion to verify the POST was called with a JSON body
  containing `per_instrument_limit`. Check:
  ```javascript
  const refreshCall = global.fetch.mock.calls.find(c => String(c[0]).includes('/refresh'));
  const opts = refreshCall[1];
  expect(opts.method).toBe("POST");
  const body = JSON.parse(opts.body);
  expect(body).toHaveProperty("per_instrument_limit");
  ```

- **"changing dropdown updates limit"** — update the option value from
  `'120'` to one of the new options (e.g., `'60'`). The callback should
  still fire `setLimit` with the numeric value.

Add new tests:

- **"fetch depth dropdown renders and defaults to 100"** — check that a
  select element with value "100" exists (the fetch-depth dropdown).

- **"fetch depth dropdown can be changed"** — change the fetch-depth
  select to "500", then trigger a refresh. Verify the POST body contains
  `"per_instrument_limit": 500`.

## Verification

```bash
cd frontend
npx vitest run
```

All tests must pass. Also verify no lint errors:

```bash
npx eslint src/ --ext .js,.jsx
```

## Constraints

- Do NOT modify any backend files
- Do NOT modify READMEs
- Keep the mock-data fallback in useVizStream unchanged
- Keep keyboard shortcut 'r' for refresh working
- Keep all existing DataControls styling (dark theme, IBM Plex Mono)
- The new fetch-depth dropdown must match the visual style of the
  existing "Per instrument" dropdown
- Commit message: `"feat(frontend): per-instrument display controls and fetch depth"`
