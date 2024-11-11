from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .enum import EnumModel
    from .record import Record
    from .relationship import RelationshipModel


class Column(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("table_id", "name"),)

    id: int | None = Field(default=None, primary_key=True)
    table_id: int = Field(foreign_key="table.id")
    name: str = Field(index=True)
    data_type: str
    constraints: str | None = Field(default=None)
    enum_id: int | None = Field(default=None, foreign_key="enummodel.id")
    required: bool = Field(default=False)
    unique: bool = Field(default=False)
    searchable: bool = Field(default=False)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    table: Optional["Table"] = Relationship(back_populates="columns")
    enum: Optional["EnumModel"] = Relationship(back_populates="columns")


class Table(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    columns: list["Column"] = Relationship(back_populates="table")

    relationships_from: list["RelationshipModel"] = Relationship(
        back_populates="from_table",
        sa_relationship_kwargs={"foreign_keys": "RelationshipModel.from_table_id"},
    )
    relationships_to: list["RelationshipModel"] = Relationship(
        back_populates="to_table",
        sa_relationship_kwargs={"foreign_keys": "RelationshipModel.to_table_id"},
    )

    records: list["Record"] = Relationship(back_populates="table")
