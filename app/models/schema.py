from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .enum import EnumModel
    from .link import LinkTable
    from .record import Record


class Column(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("table_id", "name"),)

    id: int | None = Field(default=None, primary_key=True)
    table_id: int = Field(foreign_key="table.id")
    name: str = Field(index=True)
    data_type: str
    is_list: bool = Field(default=False)
    constraints: str | None = Field(default=None)
    enum_id: int | None = Field(default=None, foreign_key="enummodel.id")
    reference_table_id: int | None = Field(default=None, foreign_key="table.id")
    reference_link_table_id: int | None = Field(
        default=None, foreign_key="linktable.id"
    )
    required: bool = Field(default=False)
    unique: bool = Field(default=False)
    searchable: bool = Field(default=False)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Specify foreign_keys to resolve ambiguity
    table: Optional["Table"] = Relationship(
        back_populates="columns",
        sa_relationship_kwargs={"foreign_keys": "[Column.table_id]"},
    )
    enum: Optional["EnumModel"] = Relationship(
        back_populates="columns",
        sa_relationship_kwargs={"foreign_keys": "[Column.enum_id]"},
    )
    reference_table: Optional["Table"] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "Column.reference_table_id==Table.id",
            "foreign_keys": "[Column.reference_table_id]",
        }
    )
    reference_link_table: Optional["LinkTable"] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "Column.reference_link_table_id==LinkTable.id",
            "foreign_keys": "[Column.reference_link_table_id]",
        }
    )


class Table(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    display_format: str | None = Field(default=None)
    display_format_secondary: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Specify foreign_keys to resolve ambiguity
    columns: list["Column"] = Relationship(
        back_populates="table",
        sa_relationship_kwargs={
            "foreign_keys": "[Column.table_id]",
            "lazy": "selectin",
        },
    )
    records: list["Record"] = Relationship(
        back_populates="table",
        sa_relationship_kwargs={
            "foreign_keys": "[Record.table_id]",
            "lazy": "selectin",
        },
    )

    # Add reciprocal relationships for LinkTable
    link_tables_from: list["LinkTable"] = Relationship(
        back_populates="from_table",
        sa_relationship_kwargs={
            "primaryjoin": "Table.id==LinkTable.from_table_id",
        },
    )
    link_tables_to: list["LinkTable"] = Relationship(
        back_populates="to_table",
        sa_relationship_kwargs={
            "primaryjoin": "Table.id==LinkTable.to_table_id",
        },
    )
