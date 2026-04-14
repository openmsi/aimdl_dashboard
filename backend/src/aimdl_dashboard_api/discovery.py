from __future__ import annotations

import logging
import os
import re
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

from .config import PER_INSTRUMENT_LIMIT
from .girder_client import girder

logger = logging.getLogger(__name__)

DATATYPE_TO_INSTRUMENT = {
    "pdv_alpss_output": "HELIX",
    "xrd_derived": "MAXIMA",
}

VIZ_DATATYPES = list(DATATYPE_TO_INSTRUMENT.keys())


def _extract_pair_info(filename):
    """Extract pair key and role from a MAXIMA filename."""
    stem = os.path.splitext(filename)[0]
    if stem.endswith("_scan"):
        return stem[:-5], "scan"
    if stem.endswith("_xrd"):
        return stem[:-4], "xrd"
    return None, None


def _extract_position_from_name(name):
    """Extract position token like '0_765' from filename if present."""
    m = re.search(r"_(\d+_\d+)(?:_|\.)", name)
    if m:
        return m.group(1)
    return None


_cache = {
    "visualizations": [],
    "last_refresh": 0,
    "counts": {},
}

_cache_by_id = {}
_file_id_cache = {}


def _fetch_datafiles(data_type, total_limit):
    # type: (str, int) -> List[dict]
    results = []  # type: List[dict]
    offset = 0
    page_size = 100
    while len(results) < total_limit:
        remaining = total_limit - len(results)
        limit = min(page_size, remaining)
        page = girder.get_aimdl_datafiles(
            data_type=data_type,
            limit=limit,
            offset=offset,
            sort="created",
            sortdir=-1,
        )
        if not page:
            break
        results.extend(page)
        if len(page) < limit:
            break
        offset += limit
    return results


def _build_viz(item, data_type):
    # type: (dict, str) -> Optional[dict]
    name = item.get("name", "")
    if not name.lower().endswith(".png"):
        return None

    instrument = DATATYPE_TO_INSTRUMENT.get(data_type)
    meta = item.get("meta") or {}
    igsn = meta.get("igsn") or ""
    item_id = item["_id"]

    file_id = _file_id_cache.get(item_id)
    if not file_id:
        try:
            files = girder.get_item_files(item_id)
        except Exception:
            logger.exception("Failed to fetch files for item %s", item_id)
            return None
        if not files:
            return None
        file_id = files[0]["_id"]
        _file_id_cache[item_id] = file_id

    pair_key, pair_role = (None, None)
    if instrument == "MAXIMA":
        pair_key, pair_role = _extract_pair_info(name)

    position = _extract_position_from_name(name)

    created = item.get("created") or datetime.now(timezone.utc).isoformat()

    return {
        "id": item_id,
        "name": name,
        "instrument": instrument,
        "igsn": igsn,
        "sample": igsn,
        "folder_path": f"{instrument} / {igsn}" if igsn else f"{instrument}",
        "created": created,
        "file_id": file_id,
        "metadata": meta,
        "pair_key": pair_key,
        "pair_role": pair_role,
        "position": position,
    }


def refresh_cache(per_instrument_limit=None):
    # type: (Optional[int]) -> None
    limit = per_instrument_limit or PER_INSTRUMENT_LIMIT
    logger.info("Refreshing visualization cache (limit=%d per datatype)...", limit)
    start = time.time()

    all_items = []  # type: List[dict]
    for data_type in VIZ_DATATYPES:
        try:
            page = _fetch_datafiles(data_type, limit)
        except Exception:
            logger.exception("Failed to fetch datafiles for %s", data_type)
            continue
        logger.info("%s: fetched %d items", data_type, len(page))
        for raw in page:
            viz = _build_viz(raw, data_type)
            if viz:
                all_items.append(viz)

    all_items.sort(key=lambda x: x.get("created", ""), reverse=True)

    _cache["visualizations"] = all_items
    _cache_by_id.clear()
    for item in all_items:
        _cache_by_id[item["id"]] = item

    try:
        raw_counts = girder.get_aimdl_counts()
    except Exception:
        logger.exception("Failed to fetch /aimdl/count")
        raw_counts = {}

    helix_total = int(raw_counts.get("pdv_alpss_output", 0))
    maxima_total = int(raw_counts.get("xrd_derived", 0))
    _cache["counts"] = {
        "total_files": helix_total + maxima_total,
        "by_instrument": {
            "HELIX": {"files": helix_total},
            "MAXIMA": {"files": maxima_total},
            "SPHINX": {"files": 0},
        },
        "source": "girder",
        "raw": raw_counts,
    }

    _cache["last_refresh"] = time.time()
    elapsed = time.time() - start
    logger.info(
        "Cache refreshed: %d visualizations (%d indexed) in %.1fs",
        len(all_items),
        len(_cache_by_id),
        elapsed,
    )


def get_cached_visualizations(instrument=None, igsn=None, limit=30, since=None):
    items = _cache["visualizations"]
    if instrument:
        items = [v for v in items if v["instrument"] == instrument]
    if igsn:
        items = [v for v in items if v["igsn"] == igsn]
    if since:
        items = [v for v in items if v["created"] > since.isoformat()]
    return items[:limit]


def get_cached_viz_by_id(item_id):
    """Look up a single visualization by Girder item ID. O(1)."""
    return _cache_by_id.get(item_id)


def get_instrument_counts():
    counts = {}
    for v in _cache["visualizations"]:
        inst = v["instrument"]
        counts[inst] = counts.get(inst, 0) + 1
    return counts


def get_cached_counts():
    return _cache.get("counts", {})
