from pydantic import BaseModel


class ColumnCreate(BaseModel):
    name: str
    data_type: str
    constraints: str | None = None
    required: bool = False
    unique: bool = False
    enum_id: int | None = None  # For enum columns


class ColumnRead(BaseModel):
    id: int
    table_id: int
    name: str
    data_type: str
    constraints: str | None = None
    required: bool
    unique: bool
    enum_id: int | None = None

    class Config:
        from_attributes = True


class TableCreate(BaseModel):
    name: str


class TableRead(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True
