# CLAUDE.md — AIMD-L Dashboard

## Project Overview

A real-time laboratory visualization dashboard for the Autonomous Instrumented
Materials Discovery Laboratory (AIMD-L) at Johns Hopkins University. The dashboard
displays visualizations (plots, images, maps) produced by the lab's autonomous
data processing pipelines as they arrive, organized by instrument and sample position.

**Organization:** `htmdec` on GitHub (note: repo is at `openmsi/aimdl_dashboard`)
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
### Phase 2 (current): Girder API integration via FastAPI backend
### Phase 3 (future): Real-time streaming via Kafka/SSE

## Girder Data Portal

**URL:** `https://data.htmdec.org`
**API:** `https://data.htmdec.org/api/v1`
**Auth:** API key via `AIMDL_API_KEY` environment variable
**Platform:** Kitware Girder with custom plugins (forms, entries, samples, depositions)

### AIMD-L Collection
- **Collection ID:** `665de536bcc722774ce53754`

### Visualization PNG Locations

**HELIX** (laser shock / PDV, produced by ALPSS via OpenMSIStream):
```
AIMD-L / HELIX / processed / alpss / {IGSN}_alpss / {shot_folder} / *.png
```

**MAXIMA** (synchrotron XRD, produced by Dagster XRD pipeline):
```
AIMD-L / MAXIMA / automatic_mode / {IGSN}_{id}_{position}_{date} / raw / *.png
```

**SPHINX** (nanoindentation): Not yet producing processed visualizations.

### IGSN Format
`JH[A-Z]{4}\d{5}(-\d+)?` — e.g., `JHAMAB00022-01`, `JHXMAL00005`

### Girder API Patterns
```python
from girder_client import GirderClient
client = GirderClient(apiUrl="https://data.htmdec.org/api/v1")
client.authenticate(apiKey=os.environ["AIMDL_API_KEY"])
```

## Tech Stack

### Frontend
- **React 18** with hooks (functional components only, no class components)
- **Vite** for dev server and build
- Dark theme, IBM Plex Mono + IBM Plex Sans typography
- Instrument color coding: MAXIMA=#4ECDC4, HELIX=#FF6B6B, SPHINX=#A78BFA

### Backend
- **Python ≥3.9** (development environment uses 3.9 via conda)
- **FastAPI** with uvicorn
- **girder-client** for authenticated Girder API calls
- **Pydantic v2** for response models

## Coding Conventions

- **Components:** One component per file, default export, PascalCase filenames
- **Hooks:** `use` prefix, camelCase, one hook per file in `hooks/`
- **Styling:** Inline style objects; `globals.css` for keyframes/fonts/resets only
- **State:** React hooks only. No Redux, Zustand, or external state libraries.
- **Backend:** Standard FastAPI patterns. Pydantic models. No ORM, no database.
- **No TypeScript** — keep contribution barrier low for materials scientists
- **Secrets:** API keys in environment variables only, never in code or config files.

## URL Query Parameters

| Parameter    | Values                          | Effect                              |
|--------------|---------------------------------|-------------------------------------|
| `instrument` | `MAXIMA`, `HELIX`, `SPHINX`     | Filter to single instrument         |
| `view`       | `stream`, `spotlight`, `sample` | Set initial view mode               |
| `zoom`       | `1`–`5`                         | Grid zoom level (default 3)         |
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

## AI-Specific Guardrails

- **Python 3.9 compatibility is REQUIRED.** The development environment uses
  Python 3.9. Do NOT use `str | None` union syntax, `match` statements,
  `type` keyword aliases, or any other 3.10+ features. Use `Optional[str]`
  from `typing` instead. Add `from __future__ import annotations` to all
  backend Python files.
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
