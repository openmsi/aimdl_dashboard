# AIMD-L Live Dashboard

Real-time visualization dashboard for the Autonomous Instrumented Materials Discovery Laboratory (AIMD-L) at Johns Hopkins University.

<!-- TODO: add screenshot -->

## Quick Start

### 1. Set your Girder API key

```bash
export AIMDL_API_KEY="your-api-key-here"
```

Get your key from https://data.htmdec.org → Account → API Keys

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

The dashboard will automatically fetch real visualization PNGs from Girder.
If the backend is not running, it falls back to mock data.

### Mock-only mode (no backend needed)

```bash
cd frontend
npm run dev
# Open http://localhost:5173/?mock=true
```

## URL Parameters

| Parameter    | Values                          | Effect                              |
|--------------|---------------------------------|-------------------------------------|
| `instrument` | `MAXIMA`, `HELIX`, `SPHINX`     | Filter to single instrument         |
| `view`       | `stream`, `spotlight`, `sample` | Set initial view mode               |
| `sample`     | e.g. `JHAMAB00022-01`          | Pre-select sample in comparison     |
| `poll`       | integer (ms)                    | Override polling interval           |
| `kiosk`      | `true`                          | Hide header controls for wall mount |
| `mock`       | `true`                          | Force mock data mode                |

## Architecture

```
Lab Instruments (MAXIMA, HELIX, SPHINX)
  → Processing Pipelines
    → Girder (visualization storage at data.htmdec.org)
      → FastAPI Backend (authenticates, discovers PNGs, proxies images)
        → React Dashboard (Vite dev server)
          → Lab monitors via Chromium kiosk mode
```

- **Frontend:** React 18 + Vite, dark theme, IBM Plex typography
- **Backend:** FastAPI proxy for Girder API with in-memory caching
- **Streaming (Phase 3):** SSE via FastAPI, Kafka consumer

## Backend API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Connection status |
| `GET /api/visualizations` | List discovered PNGs (supports `?instrument=`, `?igsn=`, `?limit=`) |
| `GET /api/visualizations/{id}/image` | Proxied PNG download |
| `GET /api/instruments` | Instrument list with counts |

## Deployment

### Lab Monitors (Kiosk Mode)

```bash
chromium-browser --kiosk --noerrdialogs \
  "http://dashboard-host:5173/?instrument=MAXIMA&view=spotlight&kiosk=true"
```

### Production Build

```bash
cd frontend
npm run build
# Serve dist/ with any static file server
```

## Roadmap

- **Phase 1 (complete):** Standalone React app with procedurally generated mock data
- **Phase 2 (current):** Girder REST API integration for real visualization images
- **Phase 3:** Real-time streaming via FastAPI SSE + Kafka

## License

See [LICENSE](LICENSE).

---

Part of the [AIMD-L / HTMDEC](https://github.com/htmdec) infrastructure at Johns Hopkins University.
