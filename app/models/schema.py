from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .relationship import RelationshipModel


class Table(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    columns: list["Column"] = Relationship(back_populates="table")
    relationships_from: list["RelationshipModel"] = Relationship(
        back_populates="from_table"
    )
    relationships_to: list["RelationshipModel"] = Relationship(
        back_populates="to_table"
    )


class Column(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    table_id: int = Field(foreign_key="table.id")
    name: str
    data_type: str
    constraints: str | None = None

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    table: Table | None = Relationship(back_populates="columns")
