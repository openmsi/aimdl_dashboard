import os

GIRDER_API_URL = os.environ.get("GIRDER_API_URL", "https://data.htmdec.org/api/v1")
GIRDER_API_KEY = os.environ.get("AIMDL_API_KEY")

AIMDL_COLLECTION_ID = "665de536bcc722774ce53754"

DISCOVERY_INTERVAL = 30

DEFAULT_LIMIT = 30

PER_INSTRUMENT_LIMIT = int(os.environ.get("PER_INSTRUMENT_LIMIT", "100"))

DEFAULT_PER_INSTRUMENT = int(os.environ.get("DEFAULT_PER_INSTRUMENT", "30"))
