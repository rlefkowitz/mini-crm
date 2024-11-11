from datetime import datetime, timezone
from enum import Enum
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .schema import Table


class RelationshipType(str, Enum):
    one_to_one = "one_to_one"
    one_to_many = "one_to_many"


class RelationshipModel(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    from_table_id: int = Field(foreign_key="table.id")
    to_table_id: int = Field(foreign_key="table.id")
    relationship_type: RelationshipType = Field(default=RelationshipType.one_to_many)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    attributes: str | None = Field(default=None)

    from_table: Optional["Table"] = Relationship(
        back_populates="relationships_from",
        sa_relationship_kwargs=dict(foreign_keys="[RelationshipModel.from_table_id]"),
    )
    to_table: Optional["Table"] = Relationship(
        back_populates="relationships_to",
        sa_relationship_kwargs=dict(
            foreign_keys="[RelationshipModel.to_table_id]"
        ),  # Fixed foreign key
    )

    attributes_list: list["RelationshipAttribute"] = Relationship(
        back_populates="relationship"
    )


class RelationshipAttribute(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    relationship_id: int = Field(foreign_key="relationshipmodel.id")
    name: str
    data_type: str
    constraints: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    relationship: RelationshipModel | None = Relationship(
        back_populates="attributes_list"
    )
