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
    reference_table_id: int | None = None
    reference_link_table_id: int | None = None
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
    reference_link_table_id: int | None = None  # Added field
    searchable: bool

    class Config:
        from_attributes = True


class TableCreate(BaseModel):
    name: str
    display_format: str | None = None
    display_format_secondary: str | None = None


class TableRead(BaseModel):
    id: int
    name: str
    display_format: str | None = None
    display_format_secondary: str | None = None

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
    reference_link_table_id: int | None  # Added field
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
    display_format: str | None = None
    display_format_secondary: str | None = None


class SchemaResponse(BaseModel):
    data_schema: dict[str, TableSchema]
