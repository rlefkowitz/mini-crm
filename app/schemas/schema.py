from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ColumnCreate(BaseModel):
    name: str
    data_type: str
    constraints: str | None = None
    required: bool = False
    unique: bool = False
    enum_id: int | None = None  # For enum columns
    searchable: bool = False  # New field to mark column as searchable


class ColumnRead(BaseModel):
    id: int
    table_id: int
    name: str
    data_type: str
    constraints: str | None = None
    required: bool
    unique: bool
    enum_id: int | None = None
    searchable: bool

    class Config:
        from_attributes = True


class TableCreate(BaseModel):
    name: str


class TableRead(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class RecordCreate(BaseModel):
    data: dict[str, Any]


class RecordRead(BaseModel):
    id: int
    table_id: int
    data: dict[str, Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
