from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from aimdl_dashboard_api import discovery
from aimdl_dashboard_api.discovery import (
    _build_viz,
    _extract_pair_info,
    _extract_position_from_name,
    _fetch_datafiles,
    get_cached_visualizations,
    refresh_cache,
)


def test_extract_pair_info_scan():
    key, role = _extract_pair_info("scan_point_0_765_scan.png")
    assert key == "scan_point_0_765"
    assert role == "scan"


def test_extract_pair_info_xrd():
    key, role = _extract_pair_info("scan_point_0_765_xrd.png")
    assert key == "scan_point_0_765"
    assert role == "xrd"


def test_extract_pair_info_neither():
    key, role = _extract_pair_info("random_file.png")
    assert key is None
    assert role is None


def test_extract_position_from_name():
    assert _extract_position_from_name("scan_point_0_765_xrd.png") == "0_765"
    assert _extract_position_from_name("scan_point_12_34_scan.png") == "12_34"
    assert _extract_position_from_name("no_position_here.png") is None


def test_build_viz_png(mock_girder):
    item = {
        "_id": "helix001",
        "name": "JHAMAL00016-002_shot05_ch1-iq.png",
        "meta": {"igsn": "JHAMAL00016-002"},
        "created": "2026-04-13T22:42:49.000Z",
    }
    viz = _build_viz(item, "pdv_alpss_output")
    assert viz is not None
    assert viz["id"] == "helix001"
    assert viz["instrument"] == "HELIX"
    assert viz["igsn"] == "JHAMAL00016-002"
    assert viz["file_id"] == "file_abc123"


def test_build_viz_non_png(mock_girder):
    item = {
        "_id": "x1",
        "name": "config.yaml",
        "meta": {},
    }
    assert _build_viz(item, "pdv_alpss_output") is None


def test_build_viz_maxima_pair(mock_girder):
    item = {
        "_id": "maxima001",
        "name": "scan_point_0_765_xrd.png",
        "meta": {"igsn": "JHXMAL00005"},
        "created": "2026-04-13T20:00:00.000Z",
    }
    viz = _build_viz(item, "xrd_derived")
    assert viz is not None
    assert viz["instrument"] == "MAXIMA"
    assert viz["pair_key"] == "scan_point_0_765"
    assert viz["pair_role"] == "xrd"
    assert viz["position"] == "0_765"


def test_fetch_datafiles_pagination():
    mock = MagicMock()
    first_page = [{"_id": f"i{i}", "name": f"f{i}.png", "meta": {}} for i in range(100)]
    second_page = [{"_id": f"i{i}", "name": f"f{i}.png", "meta": {}} for i in range(100, 150)]

    def side_effect(data_type, limit, offset, sort, sortdir):
        if offset == 0:
            return first_page
        if offset == 100:
            return second_page
        return []

    mock.get_aimdl_datafiles = MagicMock(side_effect=side_effect)

    with patch("aimdl_dashboard_api.discovery.girder", mock):
        results = _fetch_datafiles("pdv_alpss_output", 200)

    assert len(results) == 150
    assert mock.get_aimdl_datafiles.call_count >= 2


def test_refresh_cache(mock_girder):
    refresh_cache()
    items = discovery._cache["visualizations"]
    assert len(items) == 8
    counts = discovery._cache["counts"]
    assert counts["by_instrument"]["HELIX"]["files"] == 412
    assert counts["by_instrument"]["MAXIMA"]["files"] == 1053


def test_get_cached_visualizations_filter_instrument(mock_girder):
    refresh_cache()
    helix = get_cached_visualizations(instrument="HELIX", limit=100)
    assert len(helix) == 4
    assert all(v["instrument"] == "HELIX" for v in helix)


def test_get_cached_visualizations_filter_igsn(mock_girder):
    refresh_cache()
    items = get_cached_visualizations(igsn="JHXMAL00005", limit=100)
    assert len(items) == 4
    assert all(v["igsn"] == "JHXMAL00005" for v in items)


def test_get_cached_visualizations_limit(mock_girder):
    refresh_cache()
    items = get_cached_visualizations(limit=2)
    assert len(items) == 2


def test_get_cached_visualizations_since(mock_girder):
    refresh_cache()
    since = datetime(2026, 4, 13, 0, 0, 0, tzinfo=timezone.utc)
    items = get_cached_visualizations(since=since, limit=100)
    # All fixture items are on or after 2026-04-12; filter excludes 2026-04-12 entries
    assert all(v["created"] > since.isoformat() for v in items)
