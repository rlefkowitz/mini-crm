from typing import TYPE_CHECKING, Optional

from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    from .link import LinkColumn
    from .schema import Column


class EnumValueModel(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    enum_id: int = Field(foreign_key="enummodel.id")
    value: str = Field(index=True, nullable=False)

    enum: Optional["EnumModel"] = Relationship(back_populates="values")


class EnumModel(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)

    values: list["EnumValueModel"] = Relationship(
        back_populates="enum", sa_relationship_kwargs={"cascade": "delete"}
    )

    columns: list["Column"] = Relationship(
        back_populates="enum",
        sa_relationship_kwargs={"foreign_keys": "[Column.enum_id]"},
    )

    # Relationship to LinkColumn model
    link_columns: list["LinkColumn"] = Relationship(
        back_populates="enum",
        sa_relationship_kwargs={"foreign_keys": "[LinkColumn.enum_id]"},
    )
