from pydantic import BaseModel


class EnumValueCreate(BaseModel):
    value: str


class EnumValueRead(BaseModel):
    id: int
    value: str

    class Config:
        from_attributes = True


class EnumCreate(BaseModel):
    name: str
    values: list[EnumValueCreate]


class EnumRead(BaseModel):
    id: int
    name: str
    values: list[EnumValueRead] = []

    class Config:
        from_attributes = True
