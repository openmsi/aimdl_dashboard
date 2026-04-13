from __future__ import annotations

from typing import Dict, List, Optional

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
    pair_key: Optional[str] = None
    pair_role: Optional[str] = None
    position: Optional[str] = None


class VisualizationList(BaseModel):
    items: List[Visualization]
    total: int
    instrument_counts: Dict[str, int]


class SampleVisualizationList(BaseModel):
    items: List[Visualization]
    total: int
    igsn: str
