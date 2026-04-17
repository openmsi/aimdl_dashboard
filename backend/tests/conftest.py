from __future__ import annotations

import json
import os
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

os.environ.setdefault("AIMDL_API_KEY", "test-key")
os.environ.setdefault("GIRDER_API_URL", "http://localhost:8000/api/v1")

FIXTURES_DIR = Path(__file__).parent / "fixtures"

# Minimal valid 1x1 transparent PNG
_TINY_PNG = (
    b"\x89PNG\r\n\x1a\n"
    b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
    b"\x1f\x15\xc4\x89"
    b"\x00\x00\x00\rIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01"
    b"\x5a\xf4\x8a\xf9"
    b"\x00\x00\x00\x00IEND\xaeB`\x82"
)


def _load_fixture(name: str):
    with open(FIXTURES_DIR / name) as f:
        return json.load(f)


@pytest.fixture
def helix_items():
    return _load_fixture("mock_datafiles_helix.json")


@pytest.fixture
def maxima_items():
    return _load_fixture("mock_datafiles_maxima.json")


@pytest.fixture
def counts_data():
    return _load_fixture("mock_counts.json")


@pytest.fixture
def item_files_data():
    return _load_fixture("mock_item_files.json")


def _make_mock_girder(helix_items, maxima_items, counts_data, item_files_data):
    mock = MagicMock()
    mock.connected = True
    mock.connect = MagicMock(return_value=None)

    def get_datafiles(data_type, limit=100, offset=0, sort="created", sortdir=-1):
        if data_type == "pdv_alpss_output":
            data = helix_items
        elif data_type == "xrd_derived":
            data = maxima_items
        else:
            data = []
        return data[offset : offset + limit]

    mock.get_aimdl_datafiles = MagicMock(side_effect=get_datafiles)
    mock.get_aimdl_counts = MagicMock(return_value=counts_data)
    mock.get_item_files = MagicMock(return_value=item_files_data)
    mock.download_file_bytes = MagicMock(return_value=_TINY_PNG)
    return mock


@pytest.fixture
def mock_girder(helix_items, maxima_items, counts_data, item_files_data):
    mock = _make_mock_girder(helix_items, maxima_items, counts_data, item_files_data)

    with (
        patch("aimdl_dashboard_api.girder_client.girder", mock),
        patch("aimdl_dashboard_api.discovery.girder", mock),
        patch("aimdl_dashboard_api.app.girder", mock),
    ):
        # Reset discovery cache between tests
        from aimdl_dashboard_api import discovery

        discovery._cache["visualizations"] = []
        discovery._cache["counts"] = {}
        discovery._cache["last_refresh"] = 0
        discovery._cache_by_id.clear()
        yield mock


@pytest.fixture
def app_client(mock_girder):
    from fastapi.testclient import TestClient
    from aimdl_dashboard_api.app import app

    with TestClient(app) as client:
        yield client


@pytest.fixture
def sample_viz_data():
    return [
        {
            "id": "helix001",
            "name": "JHAMAL00016-002_shot05_ch1-iq.png",
            "instrument": "HELIX",
            "igsn": "JHAMAL00016-002",
            "sample": "JHAMAL00016-002",
            "folder_path": "HELIX / JHAMAL00016-002",
            "created": "2026-04-13T22:42:49.000Z",
            "metadata": {"igsn": "JHAMAL00016-002"},
            "pair_key": None,
            "pair_role": None,
            "position": None,
        },
        {
            "id": "maxima001",
            "name": "scan_point_0_765_xrd.png",
            "instrument": "MAXIMA",
            "igsn": "JHXMAL00005",
            "sample": "JHXMAL00005",
            "folder_path": "MAXIMA / JHXMAL00005",
            "created": "2026-04-13T20:00:00.000Z",
            "metadata": {"igsn": "JHXMAL00005"},
            "pair_key": "scan_point_0_765",
            "pair_role": "xrd",
            "position": "0_765",
        },
    ]
