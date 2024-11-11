from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .relationship_junction import RelationshipJunctionModel
    from .schema import Table


class RelationshipType(str, Enum):
    one_to_one = "one_to_one"
    one_to_many = "one_to_many"
    many_to_many = "many_to_many"


class RelationshipAttribute(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    relationship_id: int = Field(foreign_key="relationshipmodel.id")
    name: str
    data_type: str
    constraints: str | None = None

    relationship: Optional["RelationshipModel"] = Relationship(
        back_populates="relationship_attributes"
    )


class RelationshipModel(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, nullable=False)
    from_table_id: int = Field(foreign_key="table.id")
    to_table_id: int = Field(foreign_key="table.id")
    relationship_type: RelationshipType

    relationship_attributes: list["RelationshipAttribute"] = Relationship(
        back_populates="relationship", sa_relationship_kwargs={"cascade": "delete"}
    )
    junctions: list["RelationshipJunctionModel"] = Relationship(
        back_populates="relationship", sa_relationship_kwargs={"cascade": "delete"}
    )

    from_table: Optional["Table"] = Relationship(
        back_populates="relationships_from",
        sa_relationship_kwargs={"foreign_keys": "RelationshipModel.from_table_id"},
    )
    to_table: Optional["Table"] = Relationship(
        back_populates="relationships_to",
        sa_relationship_kwargs={"foreign_keys": "RelationshipModel.to_table_id"},
    )
