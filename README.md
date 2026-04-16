# AIMD-L Live Dashboard

Real-time visualization dashboard for the Autonomous Instrumented Materials
Design Laboratory (AIMD-L) at Johns Hopkins University. Displays
visualization PNGs produced by AIMD-L's automated analysis pipelines
(ALPSS for HELIX laser shock, XRD processing for MAXIMA X-ray diffraction)
and provides live throughput counters when connected to the Kafka streaming
layer.

## Architecture

```
AIMD-L Instruments
  HELIX (laser shock) ──→ OpenMSIStream/Kafka ──→ ALPSS pipeline ──→ PNGs
  MAXIMA (XRD/XRF)   ──→ OpenMSIStream/Kafka ──→ XRD pipeline  ──→ PNGs
  SPHINX (nanoindent) ──→ (coming online)

All PNGs are deposited in Girder (data.htmdec.org) with metadata:
  • meta.igsn        — sample persistent identifier (IGSN DOI)
  • meta.data_type   — classification (pdv_alpss_output, xrd_derived, ...)
  • meta.runId       — experiment run UUID
  • meta.prov        — provenance (wasDerivedFrom, wasGeneratedBy)

Dashboard architecture:

  Girder /aimdl API ←── Dashboard Backend (FastAPI, port 8000)
       ↑                     ↑ proxies images, caches metadata
       │                     │
  /aimdl/count          React Frontend (Vite, port 5173)
  (public, no auth)          ↑ polls backend for visualizations
       │                     │ polls stream counter for live rates
       ↓                     ↓
  ThroughputHero ←── Stream Counter (FastAPI, port 8001) [optional]
  (fallback counts)          ↑ consumes Kafka topics
                             │ HELIX_raw, MAXIMA_raw, SPHINX_raw
```

### How the backend finds data

The dashboard backend queries the Girder `/aimdl` REST API (a server-side
MongoDB plugin) instead of walking the folder tree. This makes discovery
fast — two queries instead of 50+ folder-walk calls:

1. `GET /aimdl/datafiles?dataType=pdv_alpss_output` → HELIX visualization items
2. `GET /aimdl/datafiles?dataType=xrd_derived` → MAXIMA visualization items

Each item includes its IGSN, data type, and creation date. The backend
filters for `.png` files, resolves their Girder file IDs for image proxying,
and caches everything in memory. The cache refreshes automatically every
30 seconds, or on demand via the refresh button.

File counts come from `GET /aimdl/count`, a public MongoDB aggregation
endpoint that returns totals per data type in a single call (e.g.,
12,300 HELIX files, 15,560 MAXIMA files). These appear in the DataControls
bar and feed the ThroughputHero fallback when the stream counter is not
running.

### The stream counter (optional)

The [stream counter](https://github.com/htmdec/stream_counter) is a
separate service that consumes AIMD-L Kafka topics in real time and
maintains cumulative throughput metrics (samples analyzed, files produced,
bytes captured, rates per hour). It serves these via a REST API and
Server-Sent Events (SSE).

**When to use it:** The stream counter adds value when AIMD-L is actively
running experiments and you want to see counters increment live on a wall
monitor. It provides metrics that the Girder API cannot: real-time rates
(files/hour, bytes/hour), sample counts, and data volume. Without it, the
dashboard still shows all visualization PNGs and authoritative file counts
from Girder — you just don't get animated live counters or rate information.

**When you don't need it:** For browsing historical data, reviewing past
experiments, or developing the dashboard itself, the stream counter adds
nothing. The Girder-backed counts and visualization grid work without it.

The ThroughputHero component tries data sources in priority order:
1. SSE from stream counter (real-time animated counters)
2. Polling stream counter REST API (near-real-time)
3. Polling dashboard backend `/api/counts` (authoritative Girder totals)

If the stream counter is not running, the hero bar collapses to a thin
toggle. Click to expand it; it will show Girder-sourced file counts but
zeros for samples, bytes, and rates.

## Quick Start

There are three ways to run the dashboard, from simplest to most flexible.

### Option 1: Docker (recommended for most users)

The Docker image packages the frontend and backend into a single container.
No Python, Node.js, or build tools needed on the host — just Docker and
a Girder API key.

```bash
docker pull openmsi/aimdl-dashboard:latest
docker run -p 8000:8000 -e AIMDL_API_KEY="your-key" openmsi/aimdl-dashboard
```

Open http://localhost:8000. The container serves both the React frontend
and the FastAPI backend on a single port. The pre-built frontend is bundled
as static files inside the image and served by FastAPI alongside the API
endpoints — no separate frontend process needed.

To customize the number of visualizations loaded per instrument:

```bash
docker run -p 8000:8000 \
  -e AIMDL_API_KEY="your-key" \
  -e PER_INSTRUMENT_LIMIT=500 \
  openmsi/aimdl-dashboard
```

**With docker-compose** (includes optional stream counter for live rates):

```yaml
services:
  dashboard:
    image: openmsi/aimdl-dashboard:latest
    ports:
      - "8000:8000"
    environment:
      - AIMDL_API_KEY
      - PER_INSTRUMENT_LIMIT=100
    restart: unless-stopped

  # Optional: uncomment for real-time counter animation during experiments
  # Requires access to the AIMD-L Kafka broker.
  # stream-counter:
  #   image: htmdec/stream-counter:latest
  #   ports:
  #     - "8001:8001"
  #   environment:
  #     - AIMDL_API_KEY
  #     - KAFKA_BOOTSTRAP_SERVERS=your-broker:9092
  #   restart: unless-stopped
```

```bash
export AIMDL_API_KEY="your-key"
docker compose up
```

### Option 2: Local development (separate backend + frontend)

Use this when actively developing the dashboard code. Requires Python 3.9+
and Node.js/npm on the host.

**Prerequisites:**

- A Girder API key from https://data.htmdec.org → Account → API Keys

**Terminal 1 — Backend (port 8000):**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
export AIMDL_API_KEY="your-key"
./run.sh --no-reload
```

The `--no-reload` flag is recommended. Uvicorn's `--reload` mode uses
process spawning on macOS which can break the Girder authentication token.
Use `./run.sh` (with reload) only when actively editing backend Python files.

**Terminal 2 — Frontend (port 5173):**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

**Terminal 3 (optional) — Stream counter (port 8001):**

Only needed for real-time throughput counters during active experiments.
Requires access to the AIMD-L Kafka broker.

```bash
cd /path/to/htmdec/stream_counter
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
export AIMDL_API_KEY="your-key"
export KAFKA_BOOTSTRAP_SERVERS="your-broker:9092"
python -m stream_counter --port 8001
```

See [RUNNING.md](RUNNING.md) for a detailed startup cheatsheet.

### Option 3: Mock mode (no backend needed)

For UI development or demos without Girder access.

```bash
cd frontend
npm run dev
# Open http://localhost:5173/?mock=true
```

## Dashboard Controls

**Refresh button** or press **`R`** — triggers an immediate backend cache
refresh and re-fetches visualizations.

**Show dropdown** (30 / 60 / 120 / 250 / 500) — controls how many
visualization PNGs to display. The backend fetches up to
`PER_INSTRUMENT_LIMIT` items per data type from Girder; the frontend
dropdown selects how many of those to render.

**Instrument tabs** (ALL / MAXIMA / HELIX / SPHINX) — filter the grid to
a single instrument.

**Image click** — opens a detail modal with the full-size PNG, metadata,
and links to open the file or sample in the HTMDEC data portal.

**View modes** — Live Stream (grid), Spotlight (focus), By Sample
(two-tier selector: batch buttons group by synthesis conditions,
sub-sample pills drill into individual pieces, with sort by
sub-sample or time), Movie (time-lapse across positions).

## URL Parameters

| Parameter    | Values                          | Effect                              |
|--------------|---------------------------------|-------------------------------------|
| `instrument` | `MAXIMA`, `HELIX`, `SPHINX`     | Filter to single instrument         |
| `view`       | `stream`, `spotlight`, `sample`, `movie` | Set initial view mode      |
| `zoom`       | `1` – `5`                       | Set card size (default 3)           |
| `mock`       | `true`                          | Force mock data mode                |

## Backend API

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Connection status |
| `/api/counts` | GET | No | Authoritative file counts from Girder `/aimdl/count` |
| `/api/visualizations` | GET | No | Cached PNGs (`?instrument=`, `?igsn=`, `?limit=`, `?since=`) |
| `/api/visualizations/{id}/image` | GET | No | Proxied PNG download from Girder |
| `/api/visualizations/sample/{igsn}` | GET | No | All visualizations for a sample |
| `/api/instruments` | GET | No | Instrument list with loaded counts |
| `/api/refresh` | POST | No | Trigger immediate cache refresh |

The backend authenticates to Girder with the `AIMDL_API_KEY` on startup.
All dashboard API endpoints are unauthenticated (local use only).

## Girder /aimdl Endpoints Used

These are provided by the
[girder-jsonforms](https://github.com/xarthisius/girder-jsonforms) plugin
on the `igsn` branch, deployed at `data.htmdec.org/api/v1`:

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /aimdl/count` | Public | MongoDB aggregation: file counts per `data_type` |
| `GET /aimdl/datafiles?dataType=...` | User | Paginated items by data type (max 100/page) |
| `GET /aimdl/datatype` | User | List of distinct `data_type` values |

## Environment Variables

| Variable | Required | Default | Used by |
|----------|----------|---------|---------|
| `AIMDL_API_KEY` | Yes | — | Dashboard backend |
| `GIRDER_API_URL` | No | `https://data.htmdec.org/api/v1` | Dashboard backend |
| `PER_INSTRUMENT_LIMIT` | No | `100` | Dashboard backend (items fetched per data type) |
| `KAFKA_BOOTSTRAP_SERVERS` | For stream counter | `localhost:9092` | Stream counter |

## Data Types

| `data_type` | Instrument | Content | Shown in dashboard |
|-------------|------------|---------|-------------------|
| `pdv_alpss_output` | HELIX | ALPSS analysis plots (PNG) | Yes |
| `xrd_derived` | MAXIMA | Processed XRD patterns (PNG) | Yes |
| `pdv_trace` | HELIX | Raw PDV velocity traces | No |
| `xrd_raw` | MAXIMA | Raw 2D diffraction images | No |
| `xrf_raw` | MAXIMA | Raw XRF spectra | No |
| `xrd_calibrant_derived` | MAXIMA | Calibration plots | No |

## Deployment

### Docker

```bash
docker pull openmsi/aimdl-dashboard:latest
docker run -p 8000:8000 -e AIMDL_API_KEY="your-key" openmsi/aimdl-dashboard
# Open http://localhost:8000
```

### Lab Monitors (Kiosk Mode)

Using the Docker image on a dedicated display machine:

```bash
docker run -d --restart unless-stopped \
  -p 8000:8000 \
  -e AIMDL_API_KEY="your-key" \
  --name aimdl-dashboard \
  openmsi/aimdl-dashboard:latest

chromium-browser --kiosk --noerrdialogs \
  "http://localhost:8000/?instrument=MAXIMA&view=spotlight&zoom=2"
```

### Building the Docker image locally

```bash
docker build -t aimdl-dashboard:local .
docker run -p 8000:8000 -e AIMDL_API_KEY="your-key" aimdl-dashboard:local
```

### Building the frontend for static hosting

If deploying the frontend separately (without Docker):

```bash
cd frontend
npm run build
# Serve dist/ with any static file server
# The backend must be running and CORS-configured for the frontend origin
```

### Releasing

1. Update the version in `backend/pyproject.toml`
2. Commit: `git commit -am "Release vX.Y.Z"`
3. Tag: `git tag vX.Y.Z`
4. Push: `git push origin main --tags`

CircleCI will automatically run all tests, then publish to PyPI
(`pip install aimdl-dashboard-api`) and Docker Hub
(`docker pull openmsi/aimdl-dashboard`).

## Project Structure

```
aimdl_dashboard/
├── Dockerfile                      # Multi-stage build (frontend + backend)
├── docker-compose.yml              # Dashboard + optional stream counter
├── backend/
│   ├── src/aimdl_dashboard_api/
│   │   ├── app.py            # FastAPI application and routes
│   │   ├── cli.py            # CLI entry point (aimdl-dashboard command)
│   │   ├── config.py         # Environment-based configuration
│   │   ├── discovery.py      # /aimdl API queries and cache management
│   │   ├── girder_client.py  # Girder connection and API methods
│   │   └── models.py         # Pydantic response models
│   ├── tests/                # pytest suite (fully mocked, no network)
│   ├── pyproject.toml
│   └── run.sh
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Dashboard.jsx       # Main layout
│       │   ├── ThroughputHero.jsx  # Live counter display (collapsible)
│       │   ├── DataControls.jsx    # Refresh, limit, counts bar
│       │   ├── StreamView.jsx      # Grid of visualization cards
│       │   ├── VizDetailModal.jsx  # Full-size image + metadata modal
│       │   └── ...
│       ├── hooks/
│       │   └── useVizStream.js     # Data fetching and polling logic
│       └── config.js               # API URLs, instrument definitions
├── .circleci/config.yml            # CI/CD pipeline
├── RUNNING.md                      # Detailed startup cheatsheet
└── README.md                       # This file
```

## License

See [LICENSE](LICENSE).

---

Part of the [AIMD-L / HTMDEC](https://github.com/htmdec) infrastructure
at Johns Hopkins University.
