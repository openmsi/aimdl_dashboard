from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import pytest

# from pytest_responses import responses
from aimdl_dashboard_api.girder_client import GirderConnection


def test_connect_uses_api_key():
    with (
        patch("aimdl_dashboard_api.girder_client.GirderClient") as MockClient,
        patch("aimdl_dashboard_api.girder_client.GIRDER_API_KEY", "test-key"),
    ):
        conn = GirderConnection()
        conn.connect()
        MockClient.assert_called_once()
        MockClient.return_value.authenticate.assert_called_once_with(apiKey="test-key")
        assert conn.connected is True


def test_connect_without_key_raises():
    with patch("aimdl_dashboard_api.girder_client.GIRDER_API_KEY", None):
        conn = GirderConnection()
        with pytest.raises(RuntimeError, match="AIMDL_API_KEY"):
            conn.connect()


def test_get_aimdl_datafiles_params():
    conn = GirderConnection()
    conn.client = MagicMock()
    conn.client.get = MagicMock(return_value=[])
    conn.get_aimdl_datafiles("pdv_alpss_output", limit=50, offset=10)
    conn.client.get.assert_called_once()
    args, kwargs = conn.client.get.call_args
    assert args[0] == "aimdl/datafiles"
    params = kwargs["parameters"]
    assert params["dataType"] == "pdv_alpss_output"
    assert params["limit"] == 50
    assert params["offset"] == 10
    assert params["sort"] == "created"
    assert params["sortdir"] == -1


def test_get_aimdl_counts_calls_public_endpoint(responses):
    responses.add(
        responses.POST,
        f"{os.environ.get('GIRDER_API_URL')}/api_key/token",
        status=200,
        json={
            "user": {"_id": "userId"},
            "authToken": {"token": "token"},
            "expires": "never",
            "scope": ["all"],
        },
    )
    responses.add(
        responses.GET,
        f"{os.environ.get('GIRDER_API_URL')}/aimdl/count",
        status=200,
        json={"pdv_alpss_output": 10, "xrd_derived": 20},
    )
    conn = GirderConnection()
    conn.connect()
    result = conn.get_aimdl_counts()
    assert result == {"pdv_alpss_output": 10, "xrd_derived": 20}


def test_download_item_bytes(responses):
    responses.add(
        responses.POST,
        f"{os.environ.get('GIRDER_API_URL')}/api_key/token",
        status=200,
        json={
            "user": {"_id": "userId"},
            "authToken": {"token": "token"},
            "expires": "never",
            "scope": ["all"],
        },
    )
    conn = GirderConnection()
    conn.connect()

    responses.add(
        responses.GET,
        f"{os.environ.get('GIRDER_API_URL')}/item/file_abc/download",
        status=200,
        body=b"\x89PNG fake",
    )

    data = conn.download_item_bytes("file_abc")
    assert data == b"\x89PNG fake"


def test_get_aimdl_counts_network_error(responses):
    responses.add(
        responses.POST,
        f"{os.environ.get('GIRDER_API_URL')}/api_key/token",
        status=200,
        json={
            "user": {"_id": "userId"},
            "authToken": {"token": "token"},
            "expires": "never",
            "scope": ["all"],
        },
    )
    responses.add(
        responses.GET,
        f"{os.environ.get('GIRDER_API_URL')}/aimdl/count",
        status=503,
    )
    conn = GirderConnection()
    conn.connect()
    with pytest.raises(Exception, match="error 503"):
        conn.get_aimdl_counts()


def test_not_connected_by_default():
    conn = GirderConnection()
    assert conn.connected is False
