from __future__ import annotations
from pydantic import BaseModel
from datetime import datetime


class Visualization(BaseModel):
    id: str
    name: str
    instrument: str
    igsn: str
    sample: str
    folder_path: str
    created: datetime
    file_id: str
    thumbnail_url: str
    metadata: dict = {}
    pair_key: str | None = None
    pair_role: str | None = None
    position: str | None = None


class VisualizationList(BaseModel):
    items: list[Visualization]
    total: int
    instrument_counts: dict[str, int]


class SampleVisualizationList(BaseModel):
    items: list[Visualization]
    total: int
    igsn: str
