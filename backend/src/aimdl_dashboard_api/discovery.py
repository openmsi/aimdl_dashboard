from __future__ import annotations

import logging
import os
import re
import time
from datetime import datetime, timezone

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


def _fetch_datafiles(data_type, total_limit):
    # type: (str, int) -> List[dict]
    """Fetch PNG items of the given data type from Girder.

    Pages through results until ``total_limit`` PNGs have been collected
    or the source is exhausted.  Non-PNG items are skipped during
    pagination so that sparse data types (like xrd_derived, where PNGs
    are a small fraction of all items) still return visualizations.
    """
    results = []  # type: List[dict]
    offset = 0
    page_size = 100
    max_pages = total_limit * 20  # safety cap on total items scanned
    while len(results) < total_limit and offset < max_pages:
        page = girder.get_aimdl_datafiles(
            data_type=data_type,
            limit=page_size,
            offset=offset,
            sort="created",
            sortdir=-1,
        )
        if not page:
            break
        for item in page:
            if item.get("name", "").lower().endswith(".png"):
                results.append(item)
                if len(results) >= total_limit:
                    break
        logger.debug(
            "%s: scanned %d items, found %d PNGs so far",
            data_type,
            offset + len(page),
            len(results),
        )
        if len(page) < page_size:
            break  # last page
        offset += page_size
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
        logger.info("%s: fetched %d PNGs", data_type, len(page))
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


def get_cached_visualizations(
    instrument=None, igsn=None, limit=30, per_instrument=None, since=None
):
    if per_instrument is not None:
        items = _cache["visualizations"]
        if igsn:
            items = [v for v in items if v["igsn"] == igsn]
        if since:
            items = [v for v in items if v["created"] > since.isoformat()]
        groups = {}
        for v in items:
            groups.setdefault(v["instrument"], []).append(v)
        if instrument:
            groups = {instrument: groups.get(instrument, [])}
        merged = []
        for inst, group in groups.items():
            merged.extend(group[:per_instrument])
        merged.sort(key=lambda x: x.get("created", ""), reverse=True)
        return merged

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
