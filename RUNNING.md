# AIMD-L Dashboard — Running the System

## Prerequisites

- Python 3.9+ (your conda `base` or a clean Python)
- Node.js / npm (for the frontend)
- A Girder API key from https://data.htmdec.org → Account → API Keys

Export the API key in every terminal you open:
```bash
export AIMDL_API_KEY="your-key-here"
```

---

## Mode A: Dashboard WITHOUT Stream Counter (simplest)

The dashboard shows visualization PNGs from Girder and authoritative file
counts from the `/aimdl/count` MongoDB endpoint. The ThroughputHero shows
real totals (12k+ HELIX, 15k+ MAXIMA) sourced from Girder. No Kafka needed.

### Terminal 1 — Backend (port 8000)

```bash
cd /Users/elbert/Documents/GitHub/htmdec/aimdl_dashboard/backend
source .venv/bin/activate          # reuse existing venv
export AIMDL_API_KEY="your-key"
./run.sh
```

If no `.venv` exists yet:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .
export AIMDL_API_KEY="your-key"
./run.sh
```

Verify: `curl http://localhost:8000/api/health`
Counts: `curl http://localhost:8000/api/counts`

### Terminal 2 — Frontend (port 5173)

```bash
cd /Users/elbert/Documents/GitHub/htmdec/aimdl_dashboard/frontend
npm install                        # only needed once or after changes
npm run dev
```

Open: http://localhost:5173

### What works in this mode

- ✅ ThroughputHero shows real file counts from Girder
- ✅ Visualization grid loads PNGs via /aimdl/datafiles queries
- ✅ Refresh button triggers immediate cache reload
- ✅ Limit dropdown (30/60/120/250/500) controls how many items load
- ✅ `r` keyboard shortcut triggers refresh
- ✅ Auto-refresh every 30 seconds
- ❌ No real-time counter increments (no SSE stream)
- ❌ No rates (files/hour, bytes/hour) — these come from the stream counter

---

## Mode B: Dashboard WITH Stream Counter (full real-time)

Adds real-time counter increments via SSE as Kafka messages arrive.
Requires access to the AIMD-L Kafka broker.

### Terminal 1 — Stream Counter (port 8001)

```bash
cd /Users/elbert/Documents/GitHub/htmdec/stream_counter
source .venv/bin/activate          # reuse existing venv
export AIMDL_API_KEY="your-key"
export KAFKA_BOOTSTRAP_SERVERS="your-broker:9092"
python -m stream_counter --port 8001
```

If no `.venv` exists yet:
```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
export AIMDL_API_KEY="your-key"
export KAFKA_BOOTSTRAP_SERVERS="your-broker:9092"
python -m stream_counter --port 8001
```

Verify: `curl http://localhost:8001/api/health`

### Terminal 2 — Dashboard Backend (port 8000)

```bash
cd /Users/elbert/Documents/GitHub/htmdec/aimdl_dashboard/backend
source .venv/bin/activate
export AIMDL_API_KEY="your-key"
./run.sh
```

### Terminal 3 — Frontend (port 5173)

```bash
cd /Users/elbert/Documents/GitHub/htmdec/aimdl_dashboard/frontend
npm run dev
```

Open: http://localhost:5173

### What works in this mode

- ✅ Everything from Mode A
- ✅ Real-time counter increments via SSE
- ✅ Rates (files/hour, bytes/hour) displayed under counters
- ✅ Counters animate as new files land on Kafka topics

### ThroughputHero fallback chain

The hero component tries sources in this order:
1. **SSE** from stream counter (localhost:8001/api/throughput/stream)
2. **Polling** stream counter (localhost:8001/api/dashboard/hero) every 10s
3. **Polling** dashboard backend (localhost:8000/api/counts) for Girder totals

If the stream counter isn't running, it gracefully falls back to Girder counts.

---

## Mode C: Frontend Only / Demo Mode

No backend needed. Uses generated mock data.

```bash
cd /Users/elbert/Documents/GitHub/htmdec/aimdl_dashboard/frontend
npm run dev
```

Open: http://localhost:5173?mock=true

---

## Quick Reference

| Service         | Port | Repo                        | Needs Kafka? | Needs Girder Key? |
|-----------------|------|-----------------------------|--------------|-------------------|
| Dashboard API   | 8000 | htmdec/aimdl_dashboard      | No           | Yes               |
| Stream Counter  | 8001 | htmdec/stream_counter       | Yes          | Yes (for checkpoint) |
| Frontend        | 5173 | htmdec/aimdl_dashboard      | No           | No                |

## Useful Endpoints

```bash
# Health checks
curl http://localhost:8000/api/health
curl http://localhost:8001/api/health

# Authoritative file counts from Girder (via dashboard backend)
curl http://localhost:8000/api/counts

# Raw Girder counts (public, no auth needed)
curl https://data.htmdec.org/api/v1/aimdl/count

# Trigger manual refresh
curl -X POST http://localhost:8000/api/refresh

# Get visualizations
curl "http://localhost:8000/api/visualizations?limit=10"

# Stream counter throughput snapshot
curl http://localhost:8001/api/throughput

# Stream counter hero-shaped response
curl http://localhost:8001/api/dashboard/hero
```

## Keyboard Shortcuts (in browser)

- `r` — Refresh data immediately

## Environment Variables

| Variable                    | Required | Default                          | Used by          |
|-----------------------------|----------|----------------------------------|------------------|
| AIMDL_API_KEY               | Yes      | —                                | Both backends    |
| KAFKA_BOOTSTRAP_SERVERS     | For Mode B | localhost:9092                 | Stream counter   |
| GIRDER_API_URL              | No       | https://data.htmdec.org/api/v1   | Both backends    |
| PER_INSTRUMENT_LIMIT        | No       | 100                              | Dashboard backend|
| CHECKPOINT_INTERVAL_SECONDS | No       | 300                              | Stream counter   |
| CORS_ALLOWED_ORIGINS        | No       | localhost:5173,localhost:3000     | Stream counter   |

## Troubleshooting

**Backend crashes with `TypeError: unsupported operand type(s) for |`**
→ Python 3.9 incompatibility. Check `models.py` uses `Optional[str]`
not `str | None`.

**ThroughputHero shows zeros**
→ Stream counter not running AND dashboard backend can't reach Girder.
Check `curl https://data.htmdec.org/api/v1/aimdl/count` works.

**No visualizations loading**
→ Check `curl http://localhost:8000/api/health` returns `girder_connected: true`.
Check API key is valid.

**CORS errors in browser console**
→ Frontend must run on localhost:5173 (default Vite port). If using a
different port, add it to CORS_ALLOWED_ORIGINS for the stream counter
and to the allow_origins list in the dashboard backend's app.py.
