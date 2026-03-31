# AIMD-L Dashboard Backend

FastAPI service that authenticates to Girder, discovers visualization PNGs,
and proxies image downloads to the frontend.

## Setup

```bash
export AIMDL_API_KEY="your-key"
pip install -e .
./run.sh
```

API runs at http://localhost:8000. See the top-level README for full instructions.
