import io
import logging

from girder_client import GirderClient

from .config import GIRDER_API_URL, GIRDER_API_KEY

logger = logging.getLogger(__name__)


class GirderConnection:
    def __init__(self):
        self.client = None

    def connect(self):
        if not GIRDER_API_KEY:
            raise RuntimeError("AIMDL_API_KEY environment variable is not set")
        self.client = GirderClient(apiUrl=GIRDER_API_URL)
        self.client.authenticate(apiKey=GIRDER_API_KEY)
        logger.info("Connected to Girder at %s", GIRDER_API_URL)

    @property
    def connected(self):
        return self.client is not None

    def resolve_folder_path(self, collection_id, path_segments):
        """Walk collection -> folder -> subfolder to resolve a folder ID."""
        folders = self.client.get(
            "folder",
            parameters={
                "parentType": "collection",
                "parentId": collection_id,
                "limit": 100,
            },
        )
        folder_map = {f["name"]: f for f in folders}

        first_segment = path_segments[0]
        if first_segment not in folder_map:
            raise ValueError(f"Folder '{first_segment}' not found in collection {collection_id}")

        current = folder_map[first_segment]

        for segment in path_segments[1:]:
            subfolders = self.client.get(
                "folder",
                parameters={
                    "parentType": "folder",
                    "parentId": current["_id"],
                    "limit": 100,
                },
            )
            sub_map = {f["name"]: f for f in subfolders}
            if segment not in sub_map:
                raise ValueError(f"Subfolder '{segment}' not found in folder '{current['name']}'")
            current = sub_map[segment]

        return current["_id"]

    def list_subfolders(self, folder_id, sort="created", sort_dir=-1, limit=100):
        return self.client.get(
            "folder",
            parameters={
                "parentType": "folder",
                "parentId": folder_id,
                "sort": sort,
                "sortdir": sort_dir,
                "limit": limit,
            },
        )

    def list_items(self, folder_id, sort="created", sort_dir=-1, limit=100):
        return self.client.get(
            "item",
            parameters={
                "folderId": folder_id,
                "sort": sort,
                "sortdir": sort_dir,
                "limit": limit,
            },
        )

    def get_item_files(self, item_id):
        return self.client.get(f"item/{item_id}/files")

    def download_file_bytes(self, file_id):
        buf = io.BytesIO()
        self.client.downloadFile(file_id, buf)
        buf.seek(0)
        return buf.read()


girder = GirderConnection()
