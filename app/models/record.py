from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .relationship_junction import RelationshipJunctionModel
    from .schema import Table


class Record(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    table_id: int = Field(foreign_key="table.id")
    data: dict[str, Any] = Field(sa_column=Column(JSONB))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    table: Optional["Table"] = Relationship(back_populates="records")

    # Relationships where this record is the 'from' side
    from_relationships: list["RelationshipJunctionModel"] = Relationship(
        back_populates="from_record",
        sa_relationship_kwargs={
            "foreign_keys": ["RelationshipJunctionModel.from_record_id"]
        },
    )

    # Relationships where this record is the 'to' side
    to_relationships: list["RelationshipJunctionModel"] = Relationship(
        back_populates="to_record",
        sa_relationship_kwargs={
            "foreign_keys": ["RelationshipJunctionModel.to_record_id"]
        },
    )
