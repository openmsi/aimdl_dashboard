#!/bin/bash
# Ensure API key is set
if [ -z "$AIMDL_API_KEY" ]; then
    echo "Error: AIMDL_API_KEY environment variable is required"
    echo "Get your API key from https://data.htmdec.org → Account → API Keys"
    exit 1
fi

cd "$(dirname "$0")"
export PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}src"

# --reload watches for file changes and auto-restarts (dev convenience).
# On macOS, uvicorn's reload uses SpawnProcess which can break the
# Girder auth token. Use --no-reload (the default) if you get 401 errors.
# Pass any argument (e.g. ./run.sh --no-reload) to disable auto-reload.
if [ "$1" = "--no-reload" ]; then
    uvicorn aimdl_dashboard_api.app:app --host 0.0.0.0 --port 8000
else
    uvicorn aimdl_dashboard_api.app:app --host 0.0.0.0 --port 8000 --reload
fi
