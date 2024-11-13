from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class RecordCreate(BaseModel):
    data: dict[str, Any]


class RecordRead(BaseModel):
    id: int
    table_id: int
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime
    display_value: str | None = None
    display_value_secondary: str | None = None

    class Config:
        orm_mode = True
