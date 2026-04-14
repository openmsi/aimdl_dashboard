from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

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


def test_get_aimdl_counts_calls_public_endpoint():
    conn = GirderConnection()
    with patch("aimdl_dashboard_api.girder_client.requests.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"pdv_alpss_output": 10, "xrd_derived": 20}
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        result = conn.get_aimdl_counts()

    assert result == {"pdv_alpss_output": 10, "xrd_derived": 20}
    mock_get.assert_called_once()
    assert "/aimdl/count" in mock_get.call_args[0][0]


def test_get_item_files():
    conn = GirderConnection()
    conn.client = MagicMock()
    conn.client.get = MagicMock(return_value=[{"_id": "f1"}])
    result = conn.get_item_files("item123")
    conn.client.get.assert_called_once_with("item/item123/files")
    assert result == [{"_id": "f1"}]


def test_download_file_bytes():
    conn = GirderConnection()
    conn.client = MagicMock()

    def fake_download(file_id, buf):
        buf.write(b"\x89PNG fake")

    conn.client.downloadFile = MagicMock(side_effect=fake_download)
    data = conn.download_file_bytes("file_abc")
    assert data == b"\x89PNG fake"


def test_get_aimdl_counts_network_error():
    conn = GirderConnection()
    with patch("aimdl_dashboard_api.girder_client.requests.get") as mock_get:
        mock_get.side_effect = Exception("network down")
        with pytest.raises(Exception, match="network down"):
            conn.get_aimdl_counts()


def test_not_connected_by_default():
    conn = GirderConnection()
    assert conn.connected is False
