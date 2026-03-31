# CLAUDE.md — AIMD-L Dashboard

## Project Overview

A real-time laboratory visualization dashboard for the Autonomous Instrumented
Materials Discovery Laboratory (AIMD-L) at Johns Hopkins University. The dashboard
displays visualizations (plots, images, maps) produced by the lab's autonomous
data processing pipelines as they arrive, organized by instrument and sample position.

**Organization:** `htmdec` on GitHub
**Related infrastructure:** Kitware Girder (data portal), OpenMSIStream (Kafka-based
data streaming), Dagster (workflow orchestration)

## Architecture

```
┌─────────────────────────────────────────────────┐
│  AIMD-L Lab Instruments                         │
│  MAXIMA (Synchrotron XRD) ─┐                    │
│  HELIX  (Laser Shock/PDV)  ├─► Processing ─► Girder (visualizations in folders)
│  SPHINX (Nanoindentation)  ─┘   Pipelines       │
└─────────────────────────────────────────────────┘
                                        │
                                        ▼
                              ┌──────────────────┐
                              │  FastAPI Backend  │
                              │  - Girder proxy   │
                              │  - PNG streaming  │
                              │  - Folder walking │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │  React Frontend   │  ◄── Vite dev server
                              │  - Stream view    │
                              │  - Spotlight view  │
                              │  - Sample compare │
                              └──────────────────┘
                                       │
                                       ▼
                              Lab monitors via Chromium kiosk mode
                              ?instrument=MAXIMA on Monitor 1
                              ?instrument=HELIX  on Monitor 2
```

### Phase 1 (complete): Standalone React app with mock data
- Vite + React, no build-time dependencies beyond npm
- Simulated visualization data with procedurally generated SVG plots
- All three view modes functional
- URL query parameter filtering for multi-monitor deployment

### Phase 2 (current): Girder API integration via FastAPI backend
- FastAPI backend authenticates to Girder, walks folder hierarchies
- Proxies PNG downloads so browser doesn't need Girder auth
- Frontend fetches from backend API, falls back to mock data if unavailable

### Phase 3 (future): Real-time streaming
- Kafka consumer via OpenMSIStream for instant notification
- Server-Sent Events (SSE) push to frontend
- Dagster sensor integration

## Girder Data Portal

**URL:** `https://data.htmdec.org`
**API:** `https://data.htmdec.org/api/v1`
**Auth:** API key via `AIMDL_API_KEY` environment variable
**Platform:** Kitware Girder with custom plugins (forms, entries, samples, depositions)

### AIMD-L Collection
- **Collection ID:** `665de536bcc722774ce53754`
- Contains all AIMD-L data organized by instrument

### Visualization PNG Locations

**HELIX** (laser shock / PDV, produced by ALPSS via OpenMSIStream):
```
AIMD-L / HELIX / processed / alpss / {IGSN}_alpss / {shot_folder} / *.png
```
Example folder name: `JHAMAB00022-01_690b972cbdbc07658446b192_0_346_2025-11-06_19-51-51_shot05_ch1`
- IGSN extracted from parent folder: everything before `_alpss`
- Shot metadata encoded in subfolder name (date, shot number, channel)

**MAXIMA** (synchrotron XRD, produced by Dagster XRD pipeline):
```
AIMD-L / MAXIMA / automatic_mode / {IGSN}_{id}_{position}_{date} / raw / *.png
```
Example folder name: `JHXMAL00005_69c15fbb7590bb7e1ed257bc_0_765_2026-03-23_15-59-06`
- IGSN extracted as first segment matching pattern `JH[A-Z]{4}\d{5}(-\d+)?`
- Position encoded in folder name (e.g., `0_765`)
- DataFlow ID `6729631c1f198818440f687d` in file metadata identifies MAXIMA

**SPHINX** (nanoindentation): Not yet producing processed visualizations.

### IGSN Format
International Generic Sample Number format used in AIMD-L:
`JH[A-Z]{4}\d{5}(-\d+)?`
Examples: `JHAMAB00022-01`, `JHXMAL00005`

### Girder API Patterns
```python
from girder_client import GirderClient
client = GirderClient(apiUrl="https://data.htmdec.org/api/v1")
client.authenticate(apiKey=os.environ["AIMDL_API_KEY"])

# List items in a folder
items = client.get("item", parameters={"folderId": folder_id, "limit": 100})

# List subfolders
subfolders = client.get("folder", parameters={
    "parentType": "folder", "parentId": folder_id, "limit": 100
})

# Get files attached to an item
files = client.get(f"item/{item_id}/files")

# Download a file
client.downloadFile(file_id, output_buffer)
```

## Tech Stack

### Frontend
- **React 18** with hooks (functional components only, no class components)
- **Vite** for dev server and build
- **No component library** — custom styled components for lab aesthetic
- Dark theme, IBM Plex Mono + IBM Plex Sans typography
- Instrument color coding: MAXIMA=#4ECDC4, HELIX=#FF6B6B, SPHINX=#A78BFA

### Backend
- **FastAPI** with uvicorn
- **girder-client** for authenticated Girder API calls
- PNG proxy endpoint (streams bytes, avoids CORS and auth in browser)
- In-memory folder cache with periodic refresh

## Directory Structure

```
aimdl_dashboard/
├── CLAUDE.md
├── README.md
├── LICENSE
├── .gitignore
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── config.js             # Instruments, colors, API URL, poll interval
│       ├── styles/
│       │   └── globals.css
│       ├── hooks/
│       │   └── useVizStream.js   # Fetches from backend API, mock fallback
│       └── components/
│           ├── Dashboard.jsx
│           ├── MockVisualization.jsx  # SVG fallback when no real image
│           ├── VizCard.jsx
│           ├── InstrumentTab.jsx
│           ├── ViewModeSelector.jsx
│           ├── SpotlightView.jsx
│           ├── StreamView.jsx
│           ├── SampleComparisonView.jsx
│           ├── VizDetailModal.jsx
│           ├── StatusBar.jsx
│           └── Header.jsx
└── backend/
    ├── pyproject.toml
    ├── run.sh
    └── src/
        └── aimdl_dashboard_api/
            ├── __init__.py
            ├── app.py            # FastAPI app, CORS, routes
            ├── config.py         # Girder URL, API key, folder paths
            ├── girder_client.py  # Authenticated Girder wrapper
            ├── models.py         # Pydantic response models
            └── discovery.py      # Folder traversal and PNG discovery
```

## Coding Conventions

- **Components:** One component per file, default export, PascalCase filenames
- **Hooks:** `use` prefix, camelCase, one hook per file in `hooks/`
- **Props:** Destructured in function signature
- **Styling:** Inline style objects for component-scoped styles; `globals.css`
  for keyframes, fonts, resets, and CSS custom properties only
- **State:** React hooks only (`useState`, `useEffect`, `useCallback`, `useRef`).
  No Redux, no Zustand, no external state library.
- **Backend:** Standard FastAPI patterns. Pydantic models for responses.
  `girder-client` library for Girder access. No ORM, no database.
- **No TypeScript** for now — keep the barrier to contribution low for
  materials science collaborators
- **Comments:** Sparse, only where intent is non-obvious. No boilerplate
  comment headers.
- **Secrets:** API keys in environment variables only. Never in code,
  config files, or frontend bundles.

## Configuration

### Frontend: `frontend/src/config.js`

```js
export const INSTRUMENTS = [
  { id: "MAXIMA", label: "MAXIMA", description: "Synchrotron XRD", color: "#4ECDC4" },
  { id: "HELIX",  label: "HELIX",  description: "Laser Shock / PDV", color: "#FF6B6B" },
  { id: "SPHINX", label: "SPHINX", description: "Nanoindentation", color: "#A78BFA" },
];

export const API_CONFIG = {
  baseUrl: "http://localhost:8000/api",
  pollIntervalMs: 15000,
};
```

### Backend: environment variables

| Variable        | Required | Description                          |
|-----------------|----------|--------------------------------------|
| `AIMDL_API_KEY` | Yes      | Girder API key for data.htmdec.org   |
| `GIRDER_API_URL`| No       | Override (default: data.htmdec.org)  |

## URL Query Parameters

The dashboard reads these from `window.location.search`:

| Parameter    | Values                          | Effect                              |
|--------------|---------------------------------|-------------------------------------|
| `instrument` | `MAXIMA`, `HELIX`, `SPHINX`     | Filter to single instrument         |
| `view`       | `stream`, `spotlight`, `sample` | Set initial view mode               |
| `sample`     | e.g. `JHAMAB00022-01`          | Pre-select sample in comparison     |
| `poll`       | integer (ms)                    | Override polling interval            |
| `kiosk`      | `true`                          | Hide header controls for wall mount |
| `mock`       | `true`                          | Force mock data mode                |

## Deployment

### Development (both services)
```bash
# Terminal 1: Backend
export AIMDL_API_KEY="your-key"
cd backend && pip install -e . && ./run.sh

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Lab monitors (kiosk mode)
```bash
chromium-browser --kiosk --noerrdialogs \
  "http://dashboard-host:5173/?instrument=MAXIMA&view=spotlight&kiosk=true"
```

## Testing

- Frontend: Vitest (when added)
- Backend: pytest
- No test frameworks configured yet

## AI-Specific Guardrails

- Do NOT add TypeScript. This project intentionally uses plain JSX.
- Do NOT add a CSS-in-JS library (styled-components, emotion, etc.).
  Inline styles are the intended pattern.
- Do NOT add React Router. URL parameters via `window.location.search`
  are sufficient for this use case.
- Do NOT add a state management library. React hooks are sufficient.
- Do NOT put API keys or secrets in frontend code or config files.
  All secrets go in environment variables, accessed only by the backend.
- Do NOT introduce build-time environment variable injection.
  Keep `config.js` editable by non-developers.
- When modifying existing components, preserve all visual behavior exactly
  — do not "improve" the styling or layout unless explicitly asked.
- Keep mock mode working as a fallback. The dashboard must be demoable
  without Girder access.
