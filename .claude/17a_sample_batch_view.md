# Two-tier IGSN selector for Sample Comparison view

**Branch:** `feat/igsn-batch-grouping`

## Context

AIMD-L IGSNs have a two-level structure: an 11-character base IGSN
identifying a synthesis batch (e.g., `JHAMAL00016`) and an optional
hyphen + suffix identifying a physical sub-sample (e.g., `-006`).
The Sample Comparison view currently shows a flat list of full IGSN
buttons. This task replaces it with a two-tier batch/sub-sample
selector and adds a sort toggle.

Frontend only — no backend changes.

## Read these files first

- `frontend/src/components/SampleComparisonView.jsx`
- `frontend/src/components/VizCard.jsx`
- `frontend/src/utils.js`
- `frontend/src/config.js`
- `frontend/src/components/__tests__/` (list directory to see patterns)
- `frontend/src/components/__tests__/DataControls.test.jsx` (for style reference)
- `frontend/src/test/setup.js`

Do NOT read or modify backend files.

## Task 1: Add IGSN parsing helper to utils.js

Add two exported functions to `frontend/src/utils.js`:

```javascript
/**
 * Parse an IGSN into its base (synthesis batch) and suffix (sub-sample).
 * Examples:
 *   "JHAMAL00016-006" → { base: "JHAMAL00016", suffix: "-006" }
 *   "JHXMAL00005"     → { base: "JHXMAL00005", suffix: null }
 *   ""                → { base: "", suffix: null }
 */
export function parseIgsn(igsn) {
  if (!igsn) return { base: "", suffix: null };
  const hyphenIdx = igsn.indexOf("-");
  if (hyphenIdx === -1) return { base: igsn, suffix: null };
  return {
    base: igsn.slice(0, hyphenIdx),
    suffix: igsn.slice(hyphenIdx),
  };
}

/**
 * Extract the unique base IGSN (11-char prefix) from a full IGSN.
 */
export function baseIgsn(igsn) {
  return parseIgsn(igsn).base;
}
```

Do NOT modify the existing `timeAgo` function.

## Task 2: Rewrite SampleComparisonView.jsx

Replace the entire component with a two-tier selector design. The new
component must:

### State

- `selectedBatch` — the 11-character base IGSN (string or null)
- `selectedSuffix` — `"ALL"` (default) or a specific suffix like `"-006"`
- `sortMode` — `"suffix"` (default) or `"time"`

### Derived data

From the `data` prop, compute:

- `batches` — a sorted array of unique base IGSNs. Derive using
  `parseIgsn(v.sample || v.igsn).base` for each viz item. Filter out
  empty strings.
- `suffixesForBatch` — when a batch is selected, the sorted array of
  unique suffixes (e.g., `["-005", "-006", "-007"]`) within that batch.
  Include items with no suffix (suffix === null) as a "base" entry if
  they exist.
- `filteredData` — when `selectedSuffix === "ALL"`, all items whose
  base IGSN matches `selectedBatch`. When a specific suffix is selected,
  only items whose full IGSN matches `selectedBatch + selectedSuffix`.

### Auto-selection

- On mount or when `data` changes, auto-select the first batch if
  nothing is selected.
- When the selected batch changes, reset `selectedSuffix` to `"ALL"`.

### Sorting

Within each instrument column, sort the filtered items:
- When `sortMode === "suffix"`: sort by suffix first (alphabetical),
  then by timestamp within each suffix group.
- When `sortMode === "time"`: sort by timestamp descending (newest first).

### Layout

**Top row — batch buttons:**
```jsx
<div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
  {batches.map((batch) => (
    <button key={batch} onClick={() => { setSelectedBatch(batch); setSelectedSuffix("ALL"); }}
      style={{
        padding: "6px 14px",
        border: selectedBatch === batch ? "1px solid #FFE66D60" : "1px solid #1e2740",
        borderRadius: "5px",
        background: selectedBatch === batch ? "#FFE66D10" : "#0d1220",
        color: selectedBatch === batch ? "#FFE66D" : "#4a5672",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "12px",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {batch}
    </button>
  ))}
</div>
```

**Second row — sub-sample pills + sort toggle:**

Only render when a batch is selected and there are multiple suffixes
(or at least one suffix). Show an `ALL` pill plus one pill per suffix.
On the right side of this row, show a small sort toggle.

```jsx
<div style={{ display: "flex", gap: "6px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
  {["ALL", ...suffixesForBatch].map((sfx) => (
    <button key={sfx} onClick={() => setSelectedSuffix(sfx)}
      style={{
        padding: "4px 10px",
        border: selectedSuffix === sfx ? "1px solid #4ECDC460" : "1px solid #1e2740",
        borderRadius: "12px",
        background: selectedSuffix === sfx ? "#4ECDC410" : "#0d1220",
        color: selectedSuffix === sfx ? "#4ECDC4" : "#3d4d6b",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "11px",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {sfx === "ALL" ? "ALL" : sfx}
    </button>
  ))}
  <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
    <button onClick={() => setSortMode("suffix")}
      style={{
        padding: "3px 8px",
        border: "none",
        borderRadius: "3px",
        background: sortMode === "suffix" ? "#1e274080" : "transparent",
        color: sortMode === "suffix" ? "#c8d3e8" : "#3d4d6b",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "10px",
        cursor: "pointer",
      }}
    >
      by sub-sample
    </button>
    <button onClick={() => setSortMode("time")}
      style={{
        padding: "3px 8px",
        border: "none",
        borderRadius: "3px",
        background: sortMode === "time" ? "#1e274080" : "transparent",
        color: sortMode === "time" ? "#c8d3e8" : "#3d4d6b",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: "10px",
        cursor: "pointer",
      }}
    >
      by time
    </button>
  </div>
</div>
```

The pill styling uses the teal accent (`#4ECDC4`) to distinguish
sub-sample pills from the gold batch buttons. The sort toggle is
minimal — two small text buttons on the right side of the pills row.

**Instrument columns:**

Keep the existing three-column grid layout with instrument headers.
But remove the `items.slice(0, 3)` limit — show ALL filtered items
in each column. When in `ALL` mode with `sortMode === "suffix"`, the
cards will naturally group by sub-sample within each column.

The rest of the column rendering (instrument header with colored dot,
"No data" placeholder, VizCard rendering) stays the same as the
current code.

### Removing the old `.slice(0, 3)` limit

The current code has `items.slice(0, 3)` which only shows 3 cards
per instrument column. Remove this limit entirely. The columns are
in a scrollable container (`overflow: auto` on the parent div in
Dashboard.jsx), so showing all items is fine.

## Task 3: Create tests

**Create `frontend/src/components/__tests__/SampleComparisonView.test.jsx`**

Test data factory — create a helper that generates viz items with
specific IGSNs and instruments:

```javascript
function makeViz(id, { igsn = "JHAMAL00016-005", instrument = "HELIX" } = {}) {
  return {
    id,
    instrument,
    sample: igsn,
    igsn,
    vizType: `${id}.png`,
    vizColor: "#fff",
    timestamp: new Date().toISOString(),
    imageUrl: null,
    status: "complete",
    pairKey: null,
    pairRole: null,
    position: null,
    folderPath: `${instrument} / ${igsn}`,
    fileId: `file_${id}`,
    metadata: {},
  };
}
```

Test cases:

1. **"renders batch buttons from data"** — pass data with items from
   `JHAMAL00016-005`, `JHAMAL00016-006`, and `JHXMAL00005`. Verify
   two batch buttons appear: `JHAMAL00016` and `JHXMAL00005`.

2. **"renders sub-sample pills when batch is selected"** — pass data
   with items from `-005`, `-006`, `-007` of the same batch. The
   first batch should be auto-selected. Verify `ALL`, `-005`, `-006`,
   `-007` pills are visible.

3. **"ALL mode shows items from all sub-samples"** — pass data with
   2 items from `-005` and 2 from `-006`. Verify all 4 items render
   (not just 3 — the old slice limit is removed).

4. **"selecting a suffix filters to that sub-sample"** — click a
   specific suffix pill. Verify only items matching that full IGSN
   are rendered.

5. **"sort toggle switches between suffix and time order"** — render
   with multiple sub-samples. Click "by time". Verify the toggle
   button styling changes (the `by time` button gets the active
   background).

**Add IGSN helper tests to a new file
`frontend/src/test/utils.test.js`:**

1. **"parseIgsn splits base and suffix"** —
   `parseIgsn("JHAMAL00016-006")` returns
   `{ base: "JHAMAL00016", suffix: "-006" }`.

2. **"parseIgsn handles no suffix"** —
   `parseIgsn("JHXMAL00005")` returns
   `{ base: "JHXMAL00005", suffix: null }`.

3. **"parseIgsn handles empty string"** —
   `parseIgsn("")` returns `{ base: "", suffix: null }`.

4. **"parseIgsn handles null/undefined"** —
   `parseIgsn(null)` and `parseIgsn(undefined)` both return
   `{ base: "", suffix: null }`.

5. **"baseIgsn returns just the prefix"** —
   `baseIgsn("JHAMAL00016-006")` returns `"JHAMAL00016"`.

## Task 4: Update README

In the top-level `README.md`, find the "View modes" line in the
"Dashboard Controls" section. Replace:

```
**View modes** — Live Stream (grid), Spotlight (focus), By Sample
(grouped by IGSN), Movie (time-lapse).
```

with:

```
**View modes** — Live Stream (grid), Spotlight (focus), By Sample
(two-tier selector: batch buttons group by synthesis conditions,
sub-sample pills drill into individual pieces, with sort by
sub-sample or time), Movie (time-lapse across positions).
```

## Verification

```bash
cd frontend
npx vitest run src/test/utils.test.js
npx vitest run src/components/__tests__/SampleComparisonView.test.jsx
npx vitest run
```

All tests must pass, including all previously written tests.

## Constraints

- Do NOT modify any backend files
- Do NOT modify VizCard.jsx, StreamView.jsx, MovieView.jsx, or
  Dashboard.jsx — changes are only in SampleComparisonView.jsx and
  utils.js
- Do NOT change the existing `timeAgo` function in utils.js
- Keep all existing styling conventions: dark background (#080c15 /
  #0d1220), IBM Plex Mono for all text, gold (#FFE66D) for primary
  selection, teal (#4ECDC4) for secondary selection, muted grey
  (#4a5672 / #3d4d6b) for inactive elements
- Commit message: `"feat: two-tier IGSN batch/sub-sample selector in Sample Comparison view"`
