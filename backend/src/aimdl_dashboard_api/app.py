from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .config import DISCOVERY_INTERVAL, DEFAULT_LIMIT
from .girder_client import girder
from .discovery import (
    resolve_instrument_folders,
    refresh_cache,
    get_cached_visualizations,
    get_cached_viz_by_id,
    get_instrument_counts,
)
from .models import Visualization, VisualizationList

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


async def _periodic_refresh():
    while True:
        await asyncio.sleep(DISCOVERY_INTERVAL)
        try:
            await asyncio.to_thread(refresh_cache)
        except Exception:
            logger.exception("Periodic refresh failed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        girder.connect()
        resolve_instrument_folders()
        refresh_cache()
    except Exception:
        logger.exception("Startup failed — running without Girder connection")

    task = asyncio.create_task(_periodic_refresh())
    yield
    task.cancel()


app = FastAPI(title="AIMD-L Dashboard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "girder_connected": girder.connected}


@app.get("/api/instruments")
def instruments():
    counts = get_instrument_counts()
    return [
        {
            "id": inst,
            "count": counts.get(inst, 0),
        }
        for inst in ["HELIX", "MAXIMA", "SPHINX"]
    ]


@app.get("/api/visualizations", response_model=VisualizationList)
def list_visualizations(
    instrument: Optional[str] = Query(None),
    igsn: Optional[str] = Query(None),
    limit: int = Query(DEFAULT_LIMIT, le=200),
    since: Optional[datetime] = Query(None),
):
    items = get_cached_visualizations(
        instrument=instrument, igsn=igsn, limit=limit, since=since,
    )
    counts = get_instrument_counts()
    viz_list = [
        Visualization(
            id=v["id"],
            name=v["name"],
            instrument=v["instrument"],
            igsn=v["igsn"],
            sample=v["sample"],
            folder_path=v["folder_path"],
            created=v["created"],
            file_id=v["file_id"],
            thumbnail_url=f"/api/visualizations/{v['id']}/image",
            metadata=v["metadata"],
            pair_key=v.get("pair_key"),
            pair_role=v.get("pair_role"),
        )
        for v in items
    ]
    return VisualizationList(
        items=viz_list,
        total=len(viz_list),
        instrument_counts=counts,
    )


@app.get("/api/visualizations/{item_id}/image")
def get_visualization_image(item_id: str):
    if not girder.connected:
        raise HTTPException(503, "Girder not connected")

    viz = get_cached_viz_by_id(item_id)
    if not viz:
        raise HTTPException(404, "Visualization not found in cache")

    try:
        data = girder.download_file_bytes(viz["file_id"])
        return Response(content=data, media_type="image/png")
    except Exception as e:
        logger.exception("Failed to download image %s", item_id)
        raise HTTPException(502, f"Failed to download from Girder: {e}")
