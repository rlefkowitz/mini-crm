from datetime import datetime
from typing import Any

from pydantic import BaseModel

from .schema import TableBase  # Import TableBase schema


class LinkColumnCreate(BaseModel):
    name: str
    data_type: str
    is_list: bool = False  # New field
    constraints: str | None = None
    required: bool = False
    unique: bool = False
    enum_id: int | None = None  # For enum columns


class LinkColumnRead(BaseModel):
    id: int
    link_table_id: int
    name: str
    data_type: str
    is_list: bool  # New field
    constraints: str | None = None
    required: bool
    unique: bool
    enum_id: int | None = None

    class Config:
        from_attributes = True


class LinkTableCreate(BaseModel):
    name: str
    from_table_id: int
    to_table_id: int


class LinkTableRead(BaseModel):
    id: int
    name: str
    from_table_id: int
    to_table_id: int
    from_table: TableBase  # Include from_table details
    to_table: TableBase  # Include to_table details

    class Config:
        from_attributes = True


class LinkRecordCreate(BaseModel):
    from_record_id: int
    to_record_id: int
    data: dict[str, Any] = {}


class LinkRecordRead(BaseModel):
    id: int
    link_table_id: int
    from_record_id: int
    to_record_id: int
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
