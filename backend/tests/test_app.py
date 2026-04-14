from __future__ import annotations


def test_health(app_client):
    r = app_client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["girder_connected"] is True


def test_counts(app_client):
    r = app_client.get("/api/counts")
    assert r.status_code == 200
    body = r.json()
    assert body["source"] == "girder"
    assert body["by_instrument"]["HELIX"]["files"] == 412
    assert body["by_instrument"]["MAXIMA"]["files"] == 1053
    assert body["total_files"] == 412 + 1053


def test_list_visualizations(app_client):
    r = app_client.get("/api/visualizations")
    assert r.status_code == 200
    body = r.json()
    # 4 helix pngs + 4 maxima pngs (non-png items filtered out)
    assert body["total"] == 8
    assert len(body["items"]) == 8
    assert "HELIX" in body["instrument_counts"]
    assert "MAXIMA" in body["instrument_counts"]


def test_list_visualizations_limit(app_client):
    r = app_client.get("/api/visualizations?limit=3")
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) == 3


def test_list_visualizations_filter_instrument(app_client):
    r = app_client.get("/api/visualizations?instrument=HELIX")
    assert r.status_code == 200
    body = r.json()
    assert all(v["instrument"] == "HELIX" for v in body["items"])
    assert body["total"] == 4


def test_sample_visualizations(app_client):
    r = app_client.get("/api/visualizations/sample/JHXMAL00005")
    assert r.status_code == 200
    body = r.json()
    assert body["igsn"] == "JHXMAL00005"
    assert body["total"] == 4
    assert all(v["igsn"] == "JHXMAL00005" for v in body["items"])


def test_sample_visualizations_filter_instrument(app_client):
    r = app_client.get("/api/visualizations/sample/JHXMAL00005?instrument=MAXIMA")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 4


def test_visualization_image(app_client):
    r = app_client.get("/api/visualizations/helix001/image")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert r.content.startswith(b"\x89PNG")


def test_visualization_image_not_found(app_client):
    r = app_client.get("/api/visualizations/nonexistent/image")
    assert r.status_code == 404


def test_refresh(app_client):
    r = app_client.post("/api/refresh")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["total"] == 8


def test_instruments(app_client):
    r = app_client.get("/api/instruments")
    assert r.status_code == 200
    body = r.json()
    ids = [i["id"] for i in body]
    assert ids == ["HELIX", "MAXIMA", "SPHINX"]
    by_id = {i["id"]: i["count"] for i in body}
    assert by_id["HELIX"] == 4
    assert by_id["MAXIMA"] == 4
    assert by_id["SPHINX"] == 0
