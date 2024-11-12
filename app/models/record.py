from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any, Optional

from sqlalchemy import Column as SAColumn
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .schema import Table


class Record(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    table_id: int = Field(foreign_key="table.id")
    data: dict[str, Any] = Field(sa_column=SAColumn(JSONB))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    table: Optional["Table"] = Relationship(back_populates="records")
