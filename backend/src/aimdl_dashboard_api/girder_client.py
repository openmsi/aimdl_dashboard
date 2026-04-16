import io
import logging
import threading

import requests
from girder_client import GirderClient

from .config import GIRDER_API_URL, GIRDER_API_KEY

logger = logging.getLogger(__name__)


class GirderConnection:
    def __init__(self):
        self.client = None
        self._local_thread = threading.local()

    @property
    def session(self):
        if not hasattr(self._local_thread, "session"):
            session = requests.Session()
            session.headers.update({"User-Agent": "aimdl-dashboard/1.0"})
            self._local_thread.session = session
        return self._local_thread.session

    def connect(self):
        if not GIRDER_API_KEY:
            raise RuntimeError("AIMDL_API_KEY environment variable is not set")
        self.client = GirderClient(apiUrl=GIRDER_API_URL)
        self.client._session = self.session
        self.client.authenticate(apiKey=GIRDER_API_KEY)
        logger.info("Connected to Girder at %s", GIRDER_API_URL)

    @property
    def connected(self):
        return self.client is not None

    def get_aimdl_datafiles(self, data_type, limit=100, offset=0, sort="created", sortdir=-1):
        return self.client.get(
            "aimdl/datafiles",
            parameters={
                "dataType": data_type,
                "limit": limit,
                "offset": offset,
                "sort": sort,
                "sortdir": sortdir,
            },
        )

    def get_aimdl_counts(self):
        """Public endpoint — works even without auth."""
        try:
            return self.client.get("aimdl/count")
        except Exception as e:
            logger.error("Failed to get AIMDL counts: %s", e)
            raise e

    def get_item_files(self, item_id):
        return self.client.get(f"item/{item_id}/files")

    def download_file_bytes(self, file_id):
        buf = io.BytesIO()
        self.client.downloadFile(file_id, buf)
        buf.seek(0)
        return buf.read()


girder = GirderConnection()
