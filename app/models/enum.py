from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .schema import Column


class EnumValueModel(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    enum_id: int = Field(foreign_key="enummodel.id")
    value: str = Field(index=True)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    enum: Optional["EnumModel"] = Relationship(back_populates="values")


class EnumModel(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    values: list[EnumValueModel] = Relationship(back_populates="enum")
    columns: list["Column"] = Relationship(back_populates="enum")
