# Claude Code Prompt: Keep MAXIMA scan/xrd pairs side by side

**Read CLAUDE.md first.** Then read `issues/02-maxima-scan-xrd-pairs.md` for
full context.

## GitHub Issue

Create the issue first (skip if it already exists):

```bash
gh issue create \
  --title "feat: keep MAXIMA scan/xrd PNG pairs side by side" \
  --body-file issues/02-maxima-scan-xrd-pairs.md \
  --label "enhancement"
```

Note the issue number returned. Use it in the PR later.

## Branch

```bash
git checkout main
git pull
git checkout -b feature/maxima-scan-xrd-pairs
```

## Overview

MAXIMA produces natural pairs of PNGs for each measurement: one `_scan.png`
(2D detector image) and one `_xrd.png` (integrated XRD pattern). These should
appear adjacent in the grid so researchers can compare them at a glance.

## Backend Changes

### Step 1: Add pairing logic to discovery.py

In `_discover_maxima()`, after collecting all PNG items for an experiment
folder, add pairing metadata:

```python
import os

def _extract_pair_info(filename):
    """Extract pair key and role from a MAXIMA filename.

    Returns (pair_key, pair_role) or (None, None) if not part of a pair.
    Example:
      'JHXMAL00005_..._0_765_scan.png' -> ('JHXMAL00005_..._0_765', 'scan')
      'JHXMAL00005_..._0_765_xrd.png'  -> ('JHXMAL00005_..._0_765', 'xrd')
    """
    stem = os.path.splitext(filename)[0]  # remove .png
    if stem.endswith("_scan"):
        return stem[:-5], "scan"
    elif stem.endswith("_xrd"):
        return stem[:-4], "xrd"
    return None, None
```

For each discovered MAXIMA item, add to the result dict:
```python
pair_key, pair_role = _extract_pair_info(item["name"])
results.append({
    ...existing fields...
    "pair_key": pair_key,
    "pair_role": pair_role,  # "scan", "xrd", or None
})
```

### Step 2: Sort paired items adjacently

After collecting all MAXIMA results in `_discover_maxima()`, sort them so
pairs are adjacent with `scan` before `xrd`:

```python
def _pair_sort_key(item):
    """Sort key that groups pairs together, scan before xrd."""
    pk = item.get("pair_key") or item["name"]
    role_order = {"scan": 0, "xrd": 1}
    role = role_order.get(item.get("pair_role"), 2)
    return (item.get("created", ""), pk, role)

results.sort(key=_pair_sort_key, reverse=True)
```

### Step 3: Expose pairing in the API response

In `models.py`, add optional pair fields to the `Visualization` model:
```python
class Visualization(BaseModel):
    ...existing fields...
    pair_key: str | None = None
    pair_role: str | None = None
```

In `app.py`, pass these through in `list_visualizations`:
```python
Visualization(
    ...existing fields...
    pair_key=v.get("pair_key"),
    pair_role=v.get("pair_role"),
)
```

## Frontend Changes

### Step 4: Map pair fields in useVizStream

In `frontend/src/hooks/useVizStream.js`, update `mapApiViz`:
```js
function mapApiViz(viz) {
  return {
    ...existing fields...
    pairKey: viz.pair_key || null,
    pairRole: viz.pair_role || null,
  };
}
```

### Step 5: Render pairs side-by-side in StreamView

In `frontend/src/components/StreamView.jsx`, group items by `pairKey` before
rendering. When two items share a `pairKey`, render them in a side-by-side
container:

```jsx
function groupIntoPairs(items) {
  const result = [];
  const seen = new Set();

  for (let i = 0; i < items.length; i++) {
    if (seen.has(items[i].id)) continue;
    seen.add(items[i].id);

    if (items[i].pairKey) {
      const partner = items[i + 1];
      if (partner && partner.pairKey === items[i].pairKey) {
        seen.add(partner.id);
        result.push({ type: "pair", items: [items[i], partner] });
        continue;
      }
    }
    result.push({ type: "single", items: [items[i]] });
  }
  return result;
}
```

Render paired items spanning two grid columns:

```jsx
{groups.map((group, gi) => (
  group.type === "pair" ? (
    <div key={group.items[0].id} style={{
      gridColumn: "span 2",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "8px",
      border: "1px solid #1e274040",
      borderRadius: "10px",
      padding: "6px",
      background: "#0a0e1880",
    }}>
      {group.items.map((viz) => (
        <VizCard key={viz.id} viz={viz} onClick={() => onSelect(viz)} />
      ))}
    </div>
  ) : (
    <div key={group.items[0].id} style={{
      animation: `slideIn 0.3s ease ${Math.min(gi * 0.03, 0.3)}s both`,
    }}>
      <VizCard viz={group.items[0]} onClick={() => onSelect(group.items[0])} />
    </div>
  )
))}
```

### Step 6: Add pair label overlay

In `VizCard.jsx`, add a role badge alongside the existing "PROCESSING" badge:

```jsx
{viz.pairRole && (
  <div style={{
    position: "absolute", top: 8, right: 8, zIndex: 2,
    background: `${instColor}20`, border: `1px solid ${instColor}40`,
    borderRadius: "4px", padding: "2px 8px", fontSize: "9px",
    fontFamily: "'IBM Plex Mono', monospace",
    color: instColor, textTransform: "uppercase",
  }}>
    {viz.pairRole}
  </div>
)}
```

### Step 7: Commit, push, and create PR

```bash
git add -A
git commit -m "feat: group MAXIMA scan/xrd pairs side by side

MAXIMA produces paired PNGs (_scan.png and _xrd.png) for each measurement.
Added pairing logic to the backend discovery, adjacent sorting, and
side-by-side rendering in the frontend StreamView.

Closes #ISSUE_NUMBER"
git push -u origin feature/maxima-scan-xrd-pairs

gh pr create \
  --title "feat: group MAXIMA scan/xrd pairs side by side" \
  --body "## Summary

MAXIMA produces natural pairs of PNGs for each measurement point: a 2D detector
scan image (\`_scan.png\`) and an integrated XRD pattern (\`_xrd.png\`). This PR
groups them side by side in the dashboard grid.

## Changes

**Backend:**
- Added \`_extract_pair_info()\` to parse scan/xrd filenames
- Added \`pair_key\` and \`pair_role\` fields to discovery and API response
- Sorted paired items adjacently (scan before xrd)

**Frontend:**
- \`StreamView\` groups paired items into \`span 2\` grid containers
- \`VizCard\` shows SCAN/XRD role badge on paired items

## Testing

- Paired MAXIMA items render side by side
- Unpaired items (HELIX, non-scan/xrd MAXIMA) render normally
- No regressions in other views

Closes #ISSUE_NUMBER" \
  --base main
```

Replace `#ISSUE_NUMBER` with the actual number.

## Verification Checklist

- [ ] GitHub issue created
- [ ] `_extract_pair_info` correctly parses filenames
- [ ] MAXIMA items in API include `pair_key` and `pair_role`
- [ ] Paired items appear adjacent in API response
- [ ] StreamView renders pairs side by side
- [ ] Unpaired items render normally
- [ ] Pair role labels appear on VizCards
- [ ] No regressions
- [ ] Branch pushed, PR created and linked to issue
