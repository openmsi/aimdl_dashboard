from datetime import datetime, timezone

from aimdl_dashboard_api.discovery import refresh_cache, get_cached_visualizations


def test_refresh_cache_populates_both_instruments(mock_girder):
    refresh_cache()
    items = get_cached_visualizations(limit=100)
    instruments = {v["instrument"] for v in items}
    assert "HELIX" in instruments
    assert "MAXIMA" in instruments
    assert len(items) == 10


def test_per_instrument_balances_instruments(mock_girder):
    refresh_cache()
    items = get_cached_visualizations(per_instrument=2)
    helix = [v for v in items if v["instrument"] == "HELIX"]
    maxima = [v for v in items if v["instrument"] == "MAXIMA"]
    assert len(helix) == 2
    assert len(maxima) == 2
    assert len(items) == 4


def test_per_instrument_with_instrument_filter(mock_girder):
    refresh_cache()
    items = get_cached_visualizations(per_instrument=3, instrument="MAXIMA")
    assert len(items) == 3
    assert all(v["instrument"] == "MAXIMA" for v in items)


def test_global_limit_unchanged(mock_girder):
    refresh_cache()
    items = get_cached_visualizations(limit=3)
    assert len(items) == 3
    created = [v["created"] for v in items]
    assert created == sorted(created, reverse=True)


def test_per_instrument_with_igsn_filter(mock_girder):
    refresh_cache()
    items = get_cached_visualizations(per_instrument=10, igsn="JHAMAL00016-002")
    assert len(items) > 0
    assert all(v["igsn"] == "JHAMAL00016-002" for v in items)


def test_per_instrument_exceeds_available(mock_girder):
    refresh_cache()
    items = get_cached_visualizations(per_instrument=100)
    assert len(items) == 10


def test_fetch_filters_non_png_items(mock_girder):
    refresh_cache()
    items = get_cached_visualizations(limit=100)
    for v in items:
        name = v["name"].lower()
        assert not name.endswith(".tiff")
        assert not name.endswith(".h5")
        assert not name.endswith(".csv")
    maxima = [v for v in items if v["instrument"] == "MAXIMA"]
    assert len(maxima) > 0


def test_per_instrument_works_with_sparse_pngs(mock_girder):
    refresh_cache()
    items = get_cached_visualizations(per_instrument=2)
    helix = [v for v in items if v["instrument"] == "HELIX"]
    maxima = [v for v in items if v["instrument"] == "MAXIMA"]
    assert len(helix) > 0
    assert len(maxima) > 0
