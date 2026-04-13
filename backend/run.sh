#!/bin/bash
# Ensure API key is set
if [ -z "$AIMDL_API_KEY" ]; then
    echo "Error: AIMDL_API_KEY environment variable is required"
    echo "Get your API key from https://data.htmdec.org → Account → API Keys"
    exit 1
fi

cd "$(dirname "$0")"
export PYTHONPATH="${PYTHONPATH:+$PYTHONPATH:}src"
uvicorn aimdl_dashboard_api.app:app --host 0.0.0.0 --port 8000 --reload
