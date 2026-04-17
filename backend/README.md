# aimdl-dashboard-api

FastAPI backend for the [AIMD-L visualization dashboard](https://github.com/htmdec/aimdl_dashboard),
the real-time laboratory dashboard for the Autonomous Instrumented Materials Discovery
Laboratory (AIMD-L) at Johns Hopkins University.

The backend authenticates to the [HTMDEC Girder data portal](https://data.htmdec.org),
uses API query to the MongoDB for all instruments (MAXIMA, HELIX, SPHINX), and proxies visualization
PNGs to the frontend so the browser never needs Girder credentials. In future versions auth will be added at the browser level and honor Project PID ACLs

## Installation

```bash
pip install aimdl-dashboard-api
```

## Usage

Set your Girder API key (obtain from `https://data.htmdec.org` → Account → API Keys),
then launch the server:

```bash
export AIMDL_API_KEY="your-key-here"
aimdl-dashboard --port 8000
```

Options:

```
aimdl-dashboard --host 0.0.0.0 --port 8000 [--reload]
```

The API will be available at `http://localhost:8000/api` and the OpenAPI docs
at `http://localhost:8000/docs`.

## Environment variables

| Variable         | Required | Description                                   |
|------------------|----------|-----------------------------------------------|
| `AIMDL_API_KEY`  | Yes      | Girder API key for `data.htmdec.org`          |
| `GIRDER_API_URL` | No       | Override Girder API URL (default: htmdec.org) |
| `PER_INSTRUMENT_LIMIT`   | No       | Items fetched per data type from Girder on cache refresh (default: `100`) |
| `DEFAULT_PER_INSTRUMENT` | No       | Items returned per instrument in API responses (default: `30`)            |

## Documentation

See the [main repository README](https://github.com/htmdec/aimdl_dashboard) for
full architecture, frontend setup, kiosk deployment, and development notes.

## License

MIT
