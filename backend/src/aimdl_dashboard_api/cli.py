"""CLI entry point for the AIMD-L Dashboard API."""

from __future__ import annotations

import argparse
import os
import sys


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="AIMD-L Dashboard API server",
    )
    parser.add_argument("--host", default="0.0.0.0", help="Bind host")
    parser.add_argument("--port", type=int, default=8000, help="Bind port")
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload (dev only, may break Girder auth on macOS)",
    )
    args = parser.parse_args(argv)

    if not os.environ.get("AIMDL_API_KEY"):
        print("Error: AIMDL_API_KEY environment variable is required")
        print("Get your key from https://data.htmdec.org -> Account -> API Keys")
        sys.exit(1)

    try:
        import uvicorn
    except ImportError:
        print("uvicorn is required: pip install aimdl-dashboard-api")
        sys.exit(1)

    src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if src_dir not in sys.path:
        sys.path.insert(0, src_dir)

    uvicorn.run(
        "aimdl_dashboard_api.app:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()
