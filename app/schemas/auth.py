from pydantic import BaseModel, EmailStr


class UserLogin(BaseModel):
    username: str
    password: str


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
