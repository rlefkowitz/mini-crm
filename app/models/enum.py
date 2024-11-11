from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class EnumValueModel(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    enum_id: int = Field(foreign_key="enummodel.id")
    value: str = Field(index=True, nullable=False)

    enum: Optional["EnumModel"] = Relationship(back_populates="values")


class EnumModel(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True, nullable=False)

    values: list[EnumValueModel] = Relationship(
        back_populates="enum", sa_relationship_kwargs={"cascade": "delete"}
    )
