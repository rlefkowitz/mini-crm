from enum import Enum
from typing import Optional

from pydantic import BaseModel


class RelationshipType(str, Enum):
    one_to_one = "one_to_one"
    one_to_many = "one_to_many"


class RelationshipAttributeCreate(BaseModel):
    name: str
    data_type: str
    constraints: str | None = None


class RelationshipAttributeRead(BaseModel):
    name: str
    data_type: str
    constraints: str | None = None

    class Config:
        from_attributes = True


class RelationshipCreate(BaseModel):
    name: str
    from_table: str
    to_table: str
    relationship_type: RelationshipType
    attributes: list[RelationshipAttributeCreate] | None = None


class RelationshipRead(BaseModel):
    id: int
    name: str
    from_table: str
    to_table: str
    relationship_type: RelationshipType
    attributes: list[RelationshipAttributeRead] = []

    class Config:
        from_attributes = True
