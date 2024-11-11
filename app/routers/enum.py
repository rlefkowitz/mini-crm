from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, select

from app.databases.database import get_session
from app.models.enum import EnumModel, EnumValueModel
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.enum import EnumCreate, EnumRead, EnumValueCreate, EnumValueRead
from app.utils.migration import add_enum, add_enum_value, remove_enum, remove_enum_value
from app.websocket import manager

router = APIRouter()


@router.post("/enums/", response_model=EnumRead)
def create_enum(
    enum: EnumCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    existing_enum = session.exec(
        select(EnumModel).where(EnumModel.name == enum.name)
    ).first()
    if existing_enum:
        raise HTTPException(
            status_code=400, detail="Enum with this name already exists"
        )

    db_enum = EnumModel(name=enum.name)
    session.add(db_enum)
    try:
        session.commit()
        session.refresh(db_enum)
        # Add enum values
        for value in enum.values:
            db_value = EnumValueModel(enum_id=db_enum.id, value=value.value)
            session.add(db_value)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Enum creation failed") from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        {
            "type": "schema_update",
            "action": "create_enum",
            "enum": db_enum.name,
            "values": [val.value for val in db_enum.values],  # Ensure `values` exists
        },
    )

    return EnumRead(
        id=db_enum.id,
        name=db_enum.name,
        values=[EnumValueRead.model_validate(val) for val in db_enum.values],
    )


@router.get("/enums/", response_model=list[EnumRead])
def read_enums(
    session: Session = Depends(get_session), user: User = Depends(get_current_user)
):
    enums = session.exec(select(EnumModel)).all()
    response = []
    for enum in enums:
        values = session.exec(
            select(EnumValueModel).where(EnumValueModel.enum_id == enum.id)
        ).all()
        response.append(
            EnumRead(
                id=enum.id,
                name=enum.name,
                values=[EnumValueRead.model_validate(value) for value in values],
            )
        )
    return response


@router.post("/enums/{enum_id}/values/", response_model=EnumValueRead)
def add_enum_value_endpoint(
    enum_id: int,
    value: EnumValueCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    enum = session.get(EnumModel, enum_id)
    if not enum:
        raise HTTPException(status_code=404, detail="Enum not found")

    existing_value = session.exec(
        select(EnumValueModel).where(
            EnumValueModel.enum_id == enum_id, EnumValueModel.value == value.value
        )
    ).first()
    if existing_value:
        raise HTTPException(status_code=400, detail="Enum value already exists")

    db_value = EnumValueModel(enum_id=enum_id, value=value.value)
    session.add(db_value)
    try:
        session.commit()
        session.refresh(db_value)
        add_enum_value(enum, db_value)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Failed to add enum value") from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        {
            "type": "schema_update",
            "action": "add_enum_value",
            "enum": enum.name,
            "value": value.value,
        },
    )

    return EnumValueRead.model_validate(db_value)


@router.delete("/enums/{enum_id}/values/{value_id}")
def remove_enum_value_endpoint(
    enum_id: int,
    value_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    value = session.get(EnumValueModel, value_id)
    if not value or value.enum_id != enum_id:
        raise HTTPException(status_code=404, detail="Enum value not found")

    enum = session.get(EnumModel, enum_id)
    if not enum:
        raise HTTPException(status_code=404, detail="Enum not found")

    try:
        remove_enum_value(enum, value, session)
        session.delete(value)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Failed to remove enum value"
        ) from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        {
            "type": "schema_update",
            "action": "remove_enum_value",
            "enum": enum.name,
            "value": value.value,
        },
    )

    return {"ok": True}


@router.delete("/enums/{enum_id}")
def delete_enum(
    enum_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    enum = session.get(EnumModel, enum_id)
    if not enum:
        raise HTTPException(status_code=404, detail="Enum not found")

    try:
        remove_enum(enum, session)
        session.delete(enum)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Failed to delete enum") from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        {
            "type": "schema_update",
            "action": "delete_enum",
            "enum": enum.name,
        },
    )

    return {"ok": True}
