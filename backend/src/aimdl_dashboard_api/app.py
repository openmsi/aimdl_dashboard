from __future__ import annotations

import asyncio
import logging
import os
import re
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .config import DISCOVERY_INTERVAL, DEFAULT_LIMIT, IMAGE_CACHE_DIR, IMAGE_CACHE_MAX_MB
from .file_cache import make_image_cache


from .girder_client import girder
from .discovery import (
    refresh_cache,
    get_cached_visualizations,
    get_cached_viz_by_id,
    get_instrument_counts,
    get_cached_counts,
)
from .models import Visualization, VisualizationList, SampleVisualizationList


image_cache = make_image_cache(
    cache_dir=IMAGE_CACHE_DIR,
    max_bytes=IMAGE_CACHE_MAX_MB * 1024 * 1024,
)


class RefreshRequest(BaseModel):
    per_instrument_limit: Optional[int] = None


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
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "girder_connected": girder.connected}


@app.get("/api/counts")
def get_counts():
    return get_cached_counts()


@app.post("/api/refresh")
def manual_refresh(body: Optional[RefreshRequest] = None):
    pil = body.per_instrument_limit if body else None
    try:
        refresh_cache(per_instrument_limit=pil)
    except Exception as e:
        logger.exception("Manual refresh failed")
        raise HTTPException(500, f"Refresh failed: {e}")
    return {"status": "ok", "total": len(get_cached_visualizations(limit=10000))}


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
    limit: int = Query(DEFAULT_LIMIT, le=1000),
    per_instrument: Optional[int] = Query(None, le=500),
    since: Optional[datetime] = Query(None),
):
    if per_instrument is not None:
        items = get_cached_visualizations(
            instrument=instrument,
            igsn=igsn,
            per_instrument=per_instrument,
            since=since,
        )
    else:
        items = get_cached_visualizations(
            instrument=instrument,
            igsn=igsn,
            limit=limit,
            since=since,
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
            thumbnail_url=f"/api/visualizations/{v['id']}/image",
            metadata=v["metadata"],
            pair_key=v.get("pair_key"),
            pair_role=v.get("pair_role"),
            position=v.get("position"),
        )
        for v in items
    ]
    return VisualizationList(
        items=viz_list,
        total=len(viz_list),
        instrument_counts=counts,
    )


@app.get("/api/visualizations/sample/{igsn}", response_model=SampleVisualizationList)
def get_sample_visualizations(
    igsn: str,
    instrument: Optional[str] = Query(None),
):
    """Return all visualizations for a sample, sorted by position."""
    items = get_cached_visualizations(igsn=igsn, limit=500)
    if instrument:
        items = [v for v in items if v["instrument"] == instrument]

    def position_sort_key(v):
        pos = v.get("position") or ""
        parts = re.findall(r"\d+", pos)
        return tuple(int(p) for p in parts) if parts else (pos,)

    items.sort(key=position_sort_key)

    viz_list = [
        Visualization(
            id=v["id"],
            name=v["name"],
            instrument=v["instrument"],
            igsn=v["igsn"],
            sample=v["sample"],
            folder_path=v["folder_path"],
            created=v["created"],
            thumbnail_url=f"/api/visualizations/{v['id']}/image",
            metadata=v["metadata"],
            pair_key=v.get("pair_key"),
            pair_role=v.get("pair_role"),
            position=v.get("position"),
        )
        for v in items
    ]
    return SampleVisualizationList(
        items=viz_list,
        total=len(viz_list),
        igsn=igsn,
    )


@app.get("/api/visualizations/{item_id}/image")
def get_visualization_image(item_id: str):
    if not girder.connected:
        raise HTTPException(503, "Girder not connected")

    viz = get_cached_viz_by_id(item_id)
    if not viz:
        raise HTTPException(404, "Visualization not found in cache")

    cached = image_cache.get(item_id)
    if cached is not None:
        logger.debug("Image cache hit for item_id=%s", item_id)
        return Response(content=cached, media_type="image/png")

    try:
        data = girder.download_item_bytes(item_id)
    except Exception as e:
        logger.exception("Failed to download image %s", item_id)
        raise HTTPException(502, f"Failed to download from Girder: {e}")

    image_cache.set(item_id, data)
    return Response(content=data, media_type="image/png")


# Serve pre-built frontend in Docker (directory exists only inside the container)
_static_dir = os.environ.get("AIMDL_STATIC_DIR", "/app/static")
if os.path.isdir(_static_dir):
    app.mount("/", StaticFiles(directory=_static_dir, html=True), name="static")
