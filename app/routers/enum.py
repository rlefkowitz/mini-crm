import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, select

from app.databases.database import get_session
from app.models.enum import EnumModel, EnumValueModel
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.enum import EnumCreate, EnumRead, EnumValueCreate, EnumValueRead
from app.websocket import manager

router = APIRouter()


@router.post("/enums/", response_model=EnumRead)
def create_enum(
    enum: EnumCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # Check if enum with the same name already exists
    existing_enum = session.exec(
        select(EnumModel).where(EnumModel.name == enum.name)
    ).first()
    if existing_enum:
        raise HTTPException(
            status_code=400, detail="Enum with this name already exists"
        )

    # Create EnumModel
    db_enum = EnumModel(name=enum.name)
    session.add(db_enum)
    try:
        session.commit()
        session.refresh(db_enum)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Enum creation failed") from e

    # Create EnumValueModels
    if enum.values:
        for value in enum.values:
            db_enum_value = EnumValueModel(enum_id=db_enum.id, value=value.value)
            session.add(db_enum_value)
        try:
            session.commit()
        except Exception as e:
            session.rollback()
            raise HTTPException(
                status_code=400, detail="Enum values creation failed"
            ) from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "create_enum",
                "enum": db_enum.name,
                "values": [v.value for v in db_enum.values],
            }
        ),
    )

    return EnumRead(
        id=db_enum.id,
        name=db_enum.name,
        values=[EnumValueRead.model_validate(v) for v in db_enum.values],
    )


@router.get("/enums/", response_model=list[EnumRead])
def read_enums(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    enums = session.exec(select(EnumModel)).all()
    return [
        EnumRead(
            id=enum.id,
            name=enum.name,
            values=[EnumValueRead.model_validate(v) for v in enum.values],
        )
        for enum in enums
    ]


@router.get("/enums/{enum_id}", response_model=EnumRead)
def read_enum(
    enum_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    enum = session.get(EnumModel, enum_id)
    if not enum:
        raise HTTPException(status_code=404, detail="Enum not found")
    return EnumRead(
        id=enum.id,
        name=enum.name,
        values=[EnumValueRead.model_validate(v) for v in enum.values],
    )


@router.put("/enums/{enum_id}/", response_model=EnumRead)
def update_enum(
    enum_id: int,
    enum: EnumCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    db_enum = session.get(EnumModel, enum_id)
    if not db_enum:
        raise HTTPException(status_code=404, detail="Enum not found")

    # Update enum name
    db_enum.name = enum.name

    session.add(db_enum)
    try:
        session.commit()
        session.refresh(db_enum)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Enum update failed") from e

    # Update Enum Values
    existing_values = {v.value for v in db_enum.values}
    new_values = {v.value for v in enum.values}

    # Add new values
    for value in enum.values:
        if value.value not in existing_values:
            db_enum_value = EnumValueModel(enum_id=db_enum.id, value=value.value)
            session.add(db_enum_value)

    # Remove values not present in the update
    for value in db_enum.values:
        if value.value not in new_values:
            session.delete(value)

    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Enum values update failed") from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "update_enum",
                "enum": db_enum.name,
                "values": [v.value for v in db_enum.values],
            }
        ),
    )

    return EnumRead(
        id=db_enum.id,
        name=db_enum.name,
        values=[EnumValueRead.model_validate(v) for v in db_enum.values],
    )


@router.delete("/enums/{enum_id}")
def delete_enum(
    enum_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    db_enum = session.get(EnumModel, enum_id)
    if not db_enum:
        raise HTTPException(status_code=404, detail="Enum not found")

    enum_name = db_enum.name
    session.delete(db_enum)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Enum deletion failed") from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "delete_enum",
                "enum": enum_name,
            }
        ),
    )

    return {"ok": True}
