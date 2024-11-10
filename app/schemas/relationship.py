from pydantic import BaseModel


class RelationshipAttributeCreate(BaseModel):
    name: str
    data_type: str
    constraints: str | None = None


class RelationshipAttributeRead(BaseModel):
    id: int
    name: str
    data_type: str
    constraints: str | None = None

    class Config:
        orm_mode = True


class RelationshipCreate(BaseModel):
    name: str
    from_table: str
    to_table: str
    attributes: list[RelationshipAttributeCreate] | None = None


class RelationshipRead(BaseModel):
    id: int
    name: str
    from_table: str
    to_table: str
    attributes: list[RelationshipAttributeRead] | None = None

    class Config:
        orm_mode = True
