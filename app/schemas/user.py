from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    company_id: int | None = None


class UserRead(BaseModel):
    id: int
    name: str
    email: EmailStr
    company_id: int | None = None

    class Config:
        orm_mode = True
