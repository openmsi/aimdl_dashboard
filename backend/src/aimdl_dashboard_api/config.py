import os

GIRDER_API_URL = os.environ.get("GIRDER_API_URL", "https://data.htmdec.org/api/v1")
GIRDER_API_KEY = os.environ.get("AIMDL_API_KEY")

AIMDL_COLLECTION_ID = "665de536bcc722774ce53754"

INSTRUMENT_PATHS = {
    "HELIX": ["HELIX", "processed", "alpss"],
    "MAXIMA": ["MAXIMA", "automatic_mode"],
}

DISCOVERY_INTERVAL = 30

DEFAULT_LIMIT = 30
