from datetime import datetime
from typing import Any

from pydantic import BaseModel


class RecordCreate(BaseModel):
    data: dict[str, Any]


class RecordRead(BaseModel):
    id: int
    table_id: int
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    display_value: str = ""
    display_value_secondary: str = ""

    class Config:
        from_attributes = True
