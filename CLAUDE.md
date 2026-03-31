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
                              │  FastAPI Backend  │  (optional, Phase 2)
                              │  - Girder proxy   │
                              │  - SSE stream     │
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

### Phase 1 (current): Standalone React app with mock data
- Vite + React, no build-time dependencies beyond npm
- Simulated visualization data with procedurally generated SVG plots
- All three view modes functional
- URL query parameter filtering for multi-monitor deployment

### Phase 2 (next): Girder API integration
- Replace mock data hook with Girder REST API polling
- Fetch real visualization images from Girder item download URLs
- Metadata filtering by instrument, sample position

### Phase 3 (future): Real-time streaming
- FastAPI backend with Girder polling or Kafka consumer
- Server-Sent Events (SSE) push to frontend
- Dagster sensor to detect new visualizations

## Tech Stack

### Frontend
- **React 18** with hooks (functional components only, no class components)
- **Vite** for dev server and build
- **No component library** — custom styled components for lab aesthetic
- Dark theme, IBM Plex Mono + IBM Plex Sans typography
- Instrument color coding: MAXIMA=#4ECDC4, HELIX=#FF6B6B, SPHINX=#A78BFA

### Backend (Phase 2+)
- **FastAPI** with uvicorn
- **girder-client** or direct REST calls to Girder API
- SSE via `StreamingResponse`

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
│       ├── main.jsx              # Entry point, renders App
│       ├── App.jsx               # Root component, routing/layout
│       ├── config.js             # Instruments, colors, Girder URL, poll interval
│       ├── styles/
│       │   └── globals.css       # CSS reset, fonts, keyframes, scrollbar
│       ├── hooks/
│       │   └── useVizStream.js   # Data fetching: mock now, Girder later
│       └── components/
│           ├── Dashboard.jsx         # Main dashboard container
│           ├── MockVisualization.jsx  # SVG procedural plot generator
│           ├── VizCard.jsx           # Individual visualization card
│           ├── InstrumentTab.jsx     # Filter tab button
│           ├── ViewModeSelector.jsx  # Stream/Spotlight/Sample toggle
│           ├── SpotlightView.jsx     # Latest viz large + history strip
│           ├── StreamView.jsx        # Grid of all viz cards
│           ├── SampleComparisonView.jsx  # Cross-instrument by sample
│           ├── VizDetailModal.jsx    # Click-to-expand detail overlay
│           ├── StatusBar.jsx         # Connection status footer
│           └── Header.jsx            # Top bar with title + view mode
└── backend/                     # Phase 2, placeholder for now
    └── README.md
```

## Coding Conventions

- **Components:** One component per file, default export, PascalCase filenames
- **Hooks:** `use` prefix, camelCase, one hook per file in `hooks/`
- **Props:** Destructured in function signature
- **Styling:** Inline style objects for component-scoped styles; `globals.css`
  for keyframes, fonts, resets, and CSS custom properties only
- **State:** React hooks only (`useState`, `useEffect`, `useCallback`, `useRef`).
  No Redux, no Zustand, no external state library.
- **No TypeScript** for now — keep the barrier to contribution low for
  materials science collaborators
- **Comments:** Sparse, only where intent is non-obvious. No boilerplate
  comment headers.

## Configuration

All tunable parameters live in `frontend/src/config.js`:

```js
export const INSTRUMENTS = [
  { id: "MAXIMA", label: "MAXIMA", description: "Synchrotron XRD", color: "#4ECDC4" },
  { id: "HELIX",  label: "HELIX",  description: "Laser Shock / PDV", color: "#FF6B6B" },
  { id: "SPHINX", label: "SPHINX", description: "Nanoindentation", color: "#A78BFA" },
];

export const GIRDER_CONFIG = {
  baseUrl: "https://girder.example.com/api/v1",  // Replace with real URL
  vizFolderIds: {
    MAXIMA: null,  // Girder folder IDs to be filled in
    HELIX: null,
    SPHINX: null,
  },
  pollIntervalMs: 15000,
};

export const SAMPLE_POSITIONS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1"];

export const VIZ_TYPES = [
  { name: "XRD Pattern", color: "#4ECDC4" },
  { name: "Stress-Strain", color: "#FF6B6B" },
  { name: "Nanoindentation", color: "#FFE66D" },
  { name: "Pole Figure", color: "#A78BFA" },
  { name: "Residual Stress Map", color: "#F97316" },
  { name: "Grain Size Distribution", color: "#34D399" },
];
```

## URL Query Parameters

The dashboard reads these from `window.location.search`:

| Parameter    | Values                          | Effect                              |
|--------------|---------------------------------|-------------------------------------|
| `instrument` | `MAXIMA`, `HELIX`, `SPHINX`     | Filter to single instrument         |
| `view`       | `stream`, `spotlight`, `sample` | Set initial view mode               |
| `sample`     | e.g. `A1`, `B2`                 | Pre-select sample in comparison     |
| `poll`       | integer (ms)                    | Override polling interval            |
| `kiosk`      | `true`                          | Hide header controls for wall mount |

## Deployment

### Development
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Lab monitors (kiosk mode)
```bash
# On Raspberry Pi or lab PC:
chromium-browser --kiosk --noerrdialogs \
  "http://dashboard-host:5173/?instrument=MAXIMA&view=spotlight&kiosk=true"
```

### Production build
```bash
cd frontend
npm run build
# Serve dist/ with any static file server (nginx, python -m http.server, etc.)
```

## Testing

No test framework configured yet. When added, use Vitest (aligned with Vite).

## AI-Specific Guardrails

- Do NOT add TypeScript. This project intentionally uses plain JSX.
- Do NOT add a CSS-in-JS library (styled-components, emotion, etc.).
  Inline styles are the intended pattern.
- Do NOT add React Router. URL parameters via `window.location.search`
  are sufficient for this use case.
- Do NOT add a state management library. React hooks are sufficient.
- Do NOT introduce build-time environment variable injection for Girder
  config. Keep it in `config.js` so non-developers can edit it.
- When refactoring the monolithic dashboard component into separate files,
  preserve all visual behavior exactly — do not "improve" the styling
  or layout unless explicitly asked.
