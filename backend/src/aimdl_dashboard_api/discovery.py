import re
import logging
import time
from datetime import datetime, timezone

from .config import AIMDL_COLLECTION_ID, INSTRUMENT_PATHS
from .girder_client import girder

logger = logging.getLogger(__name__)

IGSN_PATTERN = re.compile(r"(JH[A-Z]{4}\d{5}(-\d+)?)")

_cache = {
    "visualizations": [],
    "last_refresh": 0,
    "instrument_folder_ids": {},
}

_cache_by_id = {}


def extract_igsn(folder_name, instrument):
    if instrument == "HELIX" and "_alpss" in folder_name:
        return folder_name.split("_alpss")[0]
    m = IGSN_PATTERN.search(folder_name)
    if m:
        return m.group(1)
    return folder_name.split("_")[0]


def _discover_helix(base_folder_id, limit):
    results = []
    igsn_folders = girder.list_subfolders(base_folder_id, limit=50)
    logger.info("HELIX: found %d IGSN folders", len(igsn_folders))

    for igsn_folder in igsn_folders:
        igsn = extract_igsn(igsn_folder["name"], "HELIX")
        shot_folders = girder.list_subfolders(igsn_folder["_id"], limit=50)

        for shot_folder in shot_folders:
            # PNGs may be directly in the shot folder or inside a numbered subfolder (e.g. "1")
            png_items = []
            items = girder.list_items(shot_folder["_id"], limit=20)
            png_items.extend(items)

            sub_folders = girder.list_subfolders(shot_folder["_id"], limit=10)
            for sf in sub_folders:
                sf_items = girder.list_items(sf["_id"], limit=20)
                png_items.extend(sf_items)

            for item in png_items:
                if not item["name"].lower().endswith(".png"):
                    continue
                files = girder.get_item_files(item["_id"])
                if not files:
                    continue
                file_id = files[0]["_id"]
                folder_path = f"HELIX / {igsn_folder['name']} / {shot_folder['name']}"
                results.append({
                    "id": item["_id"],
                    "name": item["name"],
                    "instrument": "HELIX",
                    "igsn": igsn,
                    "sample": igsn,
                    "folder_path": folder_path,
                    "created": item.get("created", datetime.now(timezone.utc).isoformat()),
                    "file_id": file_id,
                    "metadata": item.get("meta", {}),
                })

            if len(results) >= limit:
                break
        if len(results) >= limit:
            break

    return results


def _discover_maxima(base_folder_id, limit):
    results = []
    experiment_folders = girder.list_subfolders(base_folder_id, limit=50)
    logger.info("MAXIMA: found %d experiment folders", len(experiment_folders))

    for exp_folder in experiment_folders:
        igsn = extract_igsn(exp_folder["name"], "MAXIMA")

        raw_folders = girder.list_subfolders(exp_folder["_id"], limit=10)
        raw_folder = None
        for rf in raw_folders:
            if rf["name"] == "raw":
                raw_folder = rf
                break

        if not raw_folder:
            items = girder.list_items(exp_folder["_id"], limit=20)
        else:
            items = girder.list_items(raw_folder["_id"], limit=20)

        for item in items:
            if not item["name"].lower().endswith(".png"):
                continue
            files = girder.get_item_files(item["_id"])
            if not files:
                continue
            file_id = files[0]["_id"]
            folder_path = f"MAXIMA / {exp_folder['name']}"
            if raw_folder:
                folder_path += " / raw"
            results.append({
                "id": item["_id"],
                "name": item["name"],
                "instrument": "MAXIMA",
                "igsn": igsn,
                "sample": igsn,
                "folder_path": folder_path,
                "created": item.get("created", datetime.now(timezone.utc).isoformat()),
                "file_id": file_id,
                "metadata": item.get("meta", {}),
            })

        if len(results) >= limit:
            break

    return results


DISCOVERERS = {
    "HELIX": _discover_helix,
    "MAXIMA": _discover_maxima,
}


def resolve_instrument_folders():
    for instrument, path_segments in INSTRUMENT_PATHS.items():
        try:
            folder_id = girder.resolve_folder_path(
                AIMDL_COLLECTION_ID, path_segments
            )
            _cache["instrument_folder_ids"][instrument] = folder_id
            logger.info(
                "Resolved %s folder path %s -> %s",
                instrument, "/".join(path_segments), folder_id,
            )
        except Exception:
            logger.exception("Failed to resolve folder path for %s", instrument)


def discover_visualizations(instrument=None, limit=30):
    instruments = [instrument] if instrument else list(INSTRUMENT_PATHS.keys())
    results = []

    for inst in instruments:
        folder_id = _cache["instrument_folder_ids"].get(inst)
        if not folder_id:
            logger.warning("No folder ID for instrument %s, skipping", inst)
            continue

        discoverer = DISCOVERERS.get(inst)
        if not discoverer:
            continue

        try:
            items = discoverer(folder_id, limit)
            results.extend(items)
            logger.info("Discovered %d PNGs for %s", len(items), inst)
        except Exception:
            logger.exception("Discovery failed for %s", inst)

    results.sort(key=lambda x: x["created"], reverse=True)
    return results[:limit]


def refresh_cache(per_instrument_limit=30):
    logger.info("Refreshing visualization cache...")
    start = time.time()
    all_items = []
    for inst in INSTRUMENT_PATHS:
        items = discover_visualizations(instrument=inst, limit=per_instrument_limit)
        all_items.extend(items)
    all_items.sort(key=lambda x: x["created"], reverse=True)
    _cache["visualizations"] = all_items
    _cache_by_id.clear()
    for item in all_items:
        _cache_by_id[item["id"]] = item
    _cache["last_refresh"] = time.time()
    elapsed = time.time() - start
    logger.info(
        "Cache refreshed: %d visualizations in %.1fs",
        len(_cache["visualizations"]), elapsed,
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
