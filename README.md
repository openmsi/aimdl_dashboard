# AIMD-L Live Dashboard

Real-time visualization dashboard for the Autonomous Instrumented Materials Discovery Laboratory (AIMD-L) at Johns Hopkins University.

<!-- TODO: add screenshot -->

## Quick Start

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

## URL Parameters

| Parameter    | Values                          | Effect                              |
|--------------|---------------------------------|-------------------------------------|
| `instrument` | `MAXIMA`, `HELIX`, `SPHINX`     | Filter to single instrument         |
| `view`       | `stream`, `spotlight`, `sample` | Set initial view mode               |
| `sample`     | e.g. `A1`, `B2`                 | Pre-select sample in comparison     |
| `poll`       | integer (ms)                    | Override polling interval           |
| `kiosk`      | `true`                          | Hide header controls for wall mount |

## Architecture

```
Lab Instruments (MAXIMA, HELIX, SPHINX)
  → Processing Pipelines
    → Girder (visualization storage)
      → React Dashboard (Vite dev server)
        → Lab monitors via Chromium kiosk mode
```

- **Frontend:** React 18 + Vite, dark theme, IBM Plex typography
- **Backend (Phase 2):** FastAPI proxy for Girder API
- **Streaming (Phase 3):** SSE via FastAPI, Kafka consumer

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

- **Phase 1 (current):** Standalone React app with procedurally generated mock data
- **Phase 2:** Girder REST API integration for real visualization images
- **Phase 3:** Real-time streaming via FastAPI SSE + Kafka

## License

See [LICENSE](LICENSE).

---

Part of the [AIMD-L / HTMDEC](https://github.com/htmdec) infrastructure at Johns Hopkins University.
