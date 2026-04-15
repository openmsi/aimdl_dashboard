from __future__ import annotations


def test_visualizations_per_instrument_param(app_client):
    resp = app_client.get("/api/visualizations?per_instrument=2")
    assert resp.status_code == 200
    data = resp.json()
    instruments = {v["instrument"] for v in data["items"]}
    assert "HELIX" in instruments
    assert "MAXIMA" in instruments
    for inst in instruments:
        count = sum(1 for v in data["items"] if v["instrument"] == inst)
        assert count <= 2


def test_visualizations_legacy_limit_param(app_client):
    resp = app_client.get("/api/visualizations?limit=3")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["items"]) == 3


def test_visualizations_per_instrument_overrides_limit(app_client):
    resp = app_client.get("/api/visualizations?per_instrument=2&limit=1")
    assert resp.status_code == 200
    data = resp.json()
    instruments = {v["instrument"] for v in data["items"]}
    assert len(data["items"]) > 1
    assert "HELIX" in instruments
    assert "MAXIMA" in instruments


def test_refresh_with_body(app_client):
    resp = app_client.post("/api/refresh", json={"per_instrument_limit": 50})
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_refresh_without_body(app_client):
    resp = app_client.post("/api/refresh")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_refresh_with_empty_body(app_client):
    resp = app_client.post("/api/refresh", json={})
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


def test_health_endpoint(app_client):
    resp = app_client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["girder_connected"] is True
