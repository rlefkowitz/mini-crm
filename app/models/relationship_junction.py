from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .record import Record
    from .relationship import RelationshipModel


class RelationshipJunctionModel(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    relationship_id: int = Field(foreign_key="relationshipmodel.id")
    from_record_id: int = Field(foreign_key="record.id")
    to_record_id: int = Field(foreign_key="record.id")
    attributes: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB))

    relationship: Optional["RelationshipModel"] = Relationship(
        back_populates="junctions"
    )
    from_record: Optional["Record"] = Relationship(
        back_populates="from_relationships",
        sa_relationship_kwargs={
            "foreign_keys": "RelationshipJunctionModel.from_record_id"
        },
    )
    to_record: Optional["Record"] = Relationship(
        back_populates="to_relationships",
        sa_relationship_kwargs={
            "foreign_keys": "RelationshipJunctionModel.to_record_id"
        },
    )
