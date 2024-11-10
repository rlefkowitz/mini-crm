from pydantic import BaseModel


class ColumnCreate(BaseModel):
    name: str
    data_type: str
    constraints: str | None = None


class ColumnRead(BaseModel):
    id: int
    table_id: int
    name: str
    data_type: str
    constraints: str | None = None

    class Config:
        from_attributes = True


class TableCreate(BaseModel):
    name: str


class TableRead(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True
