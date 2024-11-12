from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, Relationship, SQLModel


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    email: str = Field(index=True, unique=True)
    hashed_password: str = Field(..., nullable=False)
    company_id: int | None = Field(default=None, foreign_key="company.id")

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    company: Optional["Company"] = Relationship(
        back_populates="users",
        sa_relationship_kwargs={"foreign_keys": "[User.company_id]"},
    )


class Company(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(index=True, unique=True)
    currency: str

    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    users: list[User] = Relationship(
        back_populates="company",
        sa_relationship_kwargs={"foreign_keys": "[User.company_id]"},
    )
