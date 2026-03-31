# Claude Code Prompt: Phase 2 — Connect Dashboard to Girder

**Read CLAUDE.md first**, then read this prompt fully before starting.

## Context

The AIMD-L dashboard (in `frontend/`) is running with mock data. This prompt
connects it to real visualization PNGs stored in the Girder data management
platform at `data.htmdec.org`.

## Girder API Details

- **Base URL:** `https://data.htmdec.org/api/v1`
- **Auth:** API key via environment variable `AIMDL_API_KEY`
  (use `girder_client.GirderClient` or raw HTTP with `Girder-Token` header)
- **Collection:** The AIMD-L collection ID is `665de536bcc722774ce53754`

## Where Visualization PNGs Live

Visualizations are PNG files nested in instrument-specific folder hierarchies
under the AIMD-L collection. The paths differ by instrument:

### HELIX (laser shock / PDV)
```
AIMD-L / HELIX / processed / alpss / {IGSN}_alpss / {shot_folder} / *.png
```
Example path:
```
AIMD-L > HELIX > processed > alpss > JHAMAB00022-01_alpss >
  JHAMAB00022-01_690b972cbdbc07658446b192_0_346_2025-11-06_19-51-51_shot05_ch1 >
  *.png
```
- **Producer:** ALPSS via OpenMSIStream
- **Instrument identification:** "HELIX" in folder path; file metadata references "ALPSS"
- **IGSN:** Embedded in folder name (e.g., `JHAMAB00022-01`)
- **Shot info:** Encoded in the shot subfolder name (date, shot number, channel)

### MAXIMA (synchrotron XRD)
```
AIMD-L / MAXIMA / automatic_mode / {IGSN}_{id}_{position}_{date} / raw / *.png
```
Example path:
```
AIMD-L > MAXIMA > automatic_mode >
  JHXMAL00005_69c15fbb7590bb7e1ed257bc_0_765_2026-03-23_15-59-06 >
  raw > *.png
```
- **Producer:** Dagster XRD pipeline
- **Instrument identification:** "MAXIMA" in folder path; DataFlow ID
  `6729631c1f198818440f687d` in file metadata
- **IGSN:** Embedded in folder name (e.g., `JHXMAL00005`)
- **Position:** Encoded in folder name (`0_765` = position index)

### SPHINX (nanoindentation)
Not yet ready — skip for now but leave hooks in the code.

## Architecture

```
Browser (React)  ←→  FastAPI backend  ←→  Girder API (data.htmdec.org)
     :5173              :8000               authenticated via API key
```

The FastAPI backend:
1. Authenticates to Girder (API key stays server-side)
2. Walks instrument folder hierarchies to discover visualization PNGs
3. Caches the folder structure to avoid re-walking on every request
4. Serves a clean REST API that the React frontend consumes
5. Proxies PNG downloads (so the browser doesn't need Girder auth)

## Steps

### Step 1: Set up the FastAPI backend

Create the backend structure:
```
backend/
├── pyproject.toml
├── src/
│   └── aimdl_dashboard_api/
│       ├── __init__.py
│       ├── app.py          # FastAPI app, CORS config, routes
│       ├── config.py       # Settings (Girder URL, API key, folder IDs)
│       ├── girder_client.py # Girder connection and folder walking
│       ├── models.py       # Pydantic models for API responses
│       └── discovery.py    # Folder traversal and PNG discovery logic
```

**pyproject.toml** should include:
```toml
[project]
name = "aimdl-dashboard-api"
version = "0.1.0"
requires-python = ">=3.10"
dependencies = [
    "fastapi>=0.115",
    "uvicorn[standard]>=0.30",
    "girder-client>=3.2",
    "httpx>=0.27",
]

[project.optional-dependencies]
dev = ["pytest", "ruff"]
```

---

### Step 2: Create config.py

Use pydantic-settings or a simple dataclass. Load from environment variables:

```python
import os

GIRDER_API_URL = os.environ.get("GIRDER_API_URL", "https://data.htmdec.org/api/v1")
GIRDER_API_KEY = os.environ.get("AIMDL_API_KEY")

# Collection and top-level folder IDs (discover these on first run)
AIMDL_COLLECTION_ID = "665de536bcc722774ce53754"

# Known instrument folder paths (relative to AIMD-L collection)
# These will be resolved to folder IDs on startup
INSTRUMENT_PATHS = {
    "HELIX": ["HELIX", "processed", "alpss"],
    "MAXIMA": ["MAXIMA", "automatic_mode"],
}

# Polling interval for new visualizations (seconds)
DISCOVERY_INTERVAL = 30

# Max items to return per request
DEFAULT_LIMIT = 30
```

---

### Step 3: Create girder_client.py

Wrapper around `girder_client.GirderClient` that:
- Authenticates with the API key on initialization
- Provides helper methods:
  - `resolve_folder_path(collection_id, path_segments) -> folder_id`
    (walks the folder tree: collection → folder → subfolder → ...)
  - `list_subfolders(folder_id) -> list[dict]` (immediate children)
  - `list_items(folder_id, sort="-created") -> list[dict]` (items in folder)
  - `get_item_files(item_id) -> list[dict]` (files attached to an item)
  - `get_png_download_url(file_id) -> str` (direct download URL)
  - `download_file_bytes(file_id) -> bytes` (for proxying)

Use `girder_client.GirderClient` for authenticated requests. Example:
```python
from girder_client import GirderClient

client = GirderClient(apiUrl="https://data.htmdec.org/api/v1")
client.authenticate(apiKey=api_key)
```

---

### Step 4: Create discovery.py

This is the core logic that traverses the instrument folder hierarchies
and discovers PNG visualization items.

```python
def discover_visualizations(girder, instrument: str, limit: int = 30) -> list[dict]:
    """
    Walk the instrument folder hierarchy and return recently created PNG items.

    For HELIX:
      - Start at AIMD-L/HELIX/processed/alpss
      - Each subfolder is named {IGSN}_alpss
      - Inside each IGSN folder, subfolders represent individual shots
      - PNGs are items inside the shot folders

    For MAXIMA:
      - Start at AIMD-L/MAXIMA/automatic_mode
      - Each subfolder is named {IGSN}_{id}_{position}_{date}
      - PNGs are inside the "raw" subfolder of each experiment folder

    Returns a list of dicts:
    {
        "id": girder_item_id,
        "name": filename,
        "instrument": "HELIX" | "MAXIMA",
        "igsn": extracted IGSN,
        "sample": IGSN (for now, will be position later),
        "folder_path": human-readable path,
        "created": ISO timestamp,
        "file_id": girder_file_id (for download proxy),
        "metadata": dict of item metadata,
    }
    """
```

**IGSN extraction:** Parse from folder names:
- HELIX: folder name like `JHAMAB00022-01_alpss` → IGSN is `JHAMAB00022-01`
  (everything before `_alpss`)
- MAXIMA: folder name like `JHXMAL00005_69c15fbb7590bb7e1ed257bc_0_765_2026-03-23_15-59-06`
  → IGSN is `JHXMAL00005` (everything before the first `_` followed by a
  hex string; or more robustly, the first segment matching the IGSN pattern
  `JH[A-Z]{4}\d{5}(-\d+)?`)

**Caching strategy:**
- On first call, walk the full hierarchy and build an in-memory index
- Store `{folder_id: last_checked_timestamp}`
- On subsequent calls, only check folders created/updated since last check
- Use a simple `dict` or `TTLCache` — no external cache needed at this scale

**Sorting:** Return items sorted by creation timestamp, newest first.

---

### Step 5: Create models.py

Pydantic models for the API response:

```python
from pydantic import BaseModel
from datetime import datetime

class Visualization(BaseModel):
    id: str
    name: str
    instrument: str
    igsn: str
    sample: str  # IGSN for now, position later
    folder_path: str
    created: datetime
    file_id: str
    thumbnail_url: str  # /api/viz/{id}/image
    metadata: dict = {}

class VisualizationList(BaseModel):
    items: list[Visualization]
    total: int
    instrument_counts: dict[str, int]
```

---

### Step 6: Create app.py

FastAPI application with these endpoints:

```
GET /api/health
    → {"status": "ok", "girder_connected": bool}

GET /api/visualizations
    Query params:
      - instrument: Optional[str] (HELIX, MAXIMA)
      - igsn: Optional[str]
      - limit: int = 30
      - since: Optional[datetime] (only items created after this)
    → VisualizationList

GET /api/visualizations/{item_id}/image
    → Proxied PNG bytes from Girder (Content-Type: image/png)
    This endpoint streams the PNG from Girder so the browser doesn't need auth.

GET /api/instruments
    → List of configured instruments with folder IDs and item counts
```

**CORS:** Configure FastAPI CORS middleware to allow `http://localhost:5173`
(Vite dev server) and `http://localhost:3000` (production build).

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["GET"],
    allow_headers=["*"],
)
```

**Startup:** On app startup, resolve the instrument folder paths to folder IDs
and do an initial discovery pass. Use a `@app.on_event("startup")` or lifespan.

**Background polling:** Use a background task or `asyncio.create_task` in the
lifespan to periodically re-discover new visualizations (every 30 seconds).

---

### Step 7: Update frontend config.js

Update `frontend/src/config.js` to add backend API configuration:

```js
export const API_CONFIG = {
  baseUrl: "http://localhost:8000/api",
  pollIntervalMs: 15000,
};
```

---

### Step 8: Update useVizStream hook

Modify `frontend/src/hooks/useVizStream.js` to:

1. Fetch from `${API_CONFIG.baseUrl}/visualizations?instrument=${filter}&limit=60`
2. Poll every `pollIntervalMs`
3. Map the API response to the same shape the components expect:
   ```js
   {
     id: viz.id,
     instrument: viz.instrument,
     sample: viz.igsn,      // Will become position later
     vizType: viz.name,      // Filename for now
     vizColor: INSTRUMENT_COLOR_MAP[viz.instrument],
     timestamp: viz.created,
     imageUrl: `${API_CONFIG.baseUrl}/visualizations/${viz.id}/image`,
     status: "complete",
   }
   ```
4. Keep the mock mode as a fallback: if the API is unreachable, fall back
   to generated mock data. Control this with a `useMock` config flag.

---

### Step 9: Update VizCard and MockVisualization

When `viz.imageUrl` is present, render an `<img>` tag instead of the
SVG MockVisualization:

```jsx
{viz.imageUrl ? (
  <img
    src={viz.imageUrl}
    alt={viz.vizType}
    style={{ width: "100%", height: "100%", objectFit: "contain", background: "#0a0e17" }}
    loading="lazy"
  />
) : (
  <MockVisualization viz={viz} large={spotlight} />
)}
```

Keep MockVisualization as the fallback for when images haven't loaded
or in mock mode.

---

### Step 10: Update VizDetailModal

When showing a real visualization, add a link to the actual Girder item:

```jsx
<a
  href={`https://data.htmdec.org/#item/${viz.id}`}
  target="_blank"
  rel="noopener noreferrer"
  style={buttonStyle}
>
  Open in Girder →
</a>
```

Also display the IGSN, instrument, folder path, and any metadata from
the Girder item.

---

### Step 11: Add backend startup script

Create `backend/run.sh`:
```bash
#!/bin/bash
# Ensure API key is set
if [ -z "$AIMDL_API_KEY" ]; then
    echo "Error: AIMDL_API_KEY environment variable is required"
    echo "Get your API key from https://data.htmdec.org → Account → API Keys"
    exit 1
fi

cd "$(dirname "$0")"
uvicorn aimdl_dashboard_api.app:app --host 0.0.0.0 --port 8000 --reload
```

Make it executable: `chmod +x backend/run.sh`

---

### Step 12: Update top-level README

Add instructions for running both frontend and backend:

```markdown
## Quick Start

### 1. Set your Girder API key
```bash
export AIMDL_API_KEY="your-api-key-here"
```

### 2. Start the backend
```bash
cd backend
pip install -e .
./run.sh
# API available at http://localhost:8000
```

### 3. Start the frontend
```bash
cd frontend
npm install
npm run dev
# Dashboard at http://localhost:5173
```
```

---

### Step 13: Verify

1. Start the backend with `AIMDL_API_KEY` set
2. Verify `http://localhost:8000/api/health` returns connected status
3. Verify `http://localhost:8000/api/visualizations` returns real data
4. Verify `http://localhost:8000/api/visualizations?instrument=HELIX` filters correctly
5. Verify a PNG proxied via `/api/visualizations/{id}/image` renders in browser
6. Start the frontend — real visualization PNGs should appear in the dashboard
7. Instrument filtering should work
8. Clicking a card should show the detail modal with Girder link

---

## Important Notes

- **Do NOT commit the API key.** It must stay in environment variables only.
- **Do NOT remove mock mode.** Keep it as a fallback controlled by a config flag
  so the dashboard still works for demos without Girder access.
- The IGSN extraction regexes should be robust — test against the actual
  folder names. The pattern is approximately `/^(JH[A-Z]{4}\d{5}(-\d+)?)/`.
- PNG images may be large. Consider adding a thumbnail endpoint later that
  generates smaller versions, but for now, full PNGs are fine.
- The discovery walk may be slow on first startup if there are many folders.
  Log progress so the operator can see what's happening.

## Verification Checklist

- [ ] `pip install -e .` in backend/ succeeds
- [ ] Backend starts and connects to Girder
- [ ] `/api/health` shows `girder_connected: true`
- [ ] `/api/visualizations` returns HELIX and MAXIMA items
- [ ] `/api/visualizations/{id}/image` returns a PNG
- [ ] Frontend displays real PNGs from Girder
- [ ] Instrument filtering works end-to-end
- [ ] Mock mode fallback still works when backend is not running
- [ ] No API key exposed in frontend code or browser network tab
