from datetime import datetime
from typing import Any

from pydantic import BaseModel


class TableBase(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class ColumnCreate(BaseModel):
    name: str
    data_type: str
    is_list: bool = False
    constraints: str | None = None
    required: bool = False
    unique: bool = False
    enum_id: int | None = None
    searchable: bool = False


class ColumnRead(BaseModel):
    id: int
    table_id: int
    name: str
    data_type: str
    is_list: bool
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


class ColumnSchema(BaseModel):
    id: int
    name: str
    data_type: str
    is_list: bool
    constraints: str | None
    enum_id: int | None
    required: bool
    unique: bool
    searchable: bool
    reference_table: str | None = None


class LinkColumnSchema(BaseModel):
    id: int
    name: str
    data_type: str
    is_list: bool
    constraints: str | None
    enum_id: int | None
    required: bool
    unique: bool


class LinkTableSchema(BaseModel):
    id: int
    name: str
    from_table: str
    to_table: str
    columns: list[LinkColumnSchema]


class TableSchema(BaseModel):
    id: int
    columns: list[ColumnSchema]
    link_tables: list[LinkTableSchema]


class SchemaResponse(BaseModel):
    schema: dict[str, TableSchema]
