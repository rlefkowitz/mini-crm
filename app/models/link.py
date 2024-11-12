from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import Column as SAColumn
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .enum import EnumModel
    from .record import Record
    from .schema import Table


class LinkTable(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    from_table_id: int = Field(foreign_key="table.id")
    to_table_id: int = Field(foreign_key="table.id")

    columns: list["LinkColumn"] = Relationship(back_populates="link_table")
    records: list["LinkRecord"] = Relationship(back_populates="link_table")

    from_table: Optional["Table"] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "LinkTable.from_table_id==Table.id",
            "lazy": "joined",
        },
        back_populates="link_tables_from",
    )
    to_table: Optional["Table"] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "LinkTable.to_table_id==Table.id",
            "lazy": "joined",
        },
        back_populates="link_tables_to",
    )


class LinkColumn(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    link_table_id: int = Field(foreign_key="linktable.id")
    name: str
    data_type: str
    is_list: bool = Field(default=False)
    constraints: str | None = Field(default=None)
    enum_id: int | None = Field(default=None, foreign_key="enummodel.id")
    required: bool = Field(default=False)
    unique: bool = Field(default=False)

    link_table: Optional["LinkTable"] = Relationship(back_populates="columns")
    enum: Optional["EnumModel"] = Relationship(back_populates="link_columns")


class LinkRecord(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    link_table_id: int = Field(foreign_key="linktable.id")
    from_record_id: int = Field(foreign_key="record.id")
    to_record_id: int = Field(foreign_key="record.id")
    data: dict[str, Any] = Field(default_factory=dict, sa_column=SAColumn(JSONB))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    link_table: Optional["LinkTable"] = Relationship(back_populates="records")
    from_record: Optional["Record"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[LinkRecord.from_record_id]"}
    )
    to_record: Optional["Record"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[LinkRecord.to_record_id]"}
    )
