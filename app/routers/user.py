import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.databases.database import get_session
from app.models.user import User
from app.schemas.user import UserCreate, UserRead
from app.websocket import manager

router = APIRouter()


@router.post("/users/", response_model=UserRead)
def create_user(user: UserCreate, session: Session = Depends(get_session)):
    db_user = User.model_validate(user)
    session.add(db_user)
    try:
        session.commit()
        session.refresh(db_user)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="User creation failed") from e
    # Broadcast data update
    asyncio.create_task(
        manager.broadcast(
            json.dumps(
                {
                    "type": "data_update",
                    "action": "create",
                    "entity": "user",
                    "id": db_user.id,
                }
            )
        )
    )
    return db_user


@router.get("/users/", response_model=list[UserRead])
def read_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    return users


@router.get("/users/{user_id}", response_model=UserRead)
def read_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.put("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int, user: UserCreate, session: Session = Depends(get_session)
):
    db_user = session.get(User, user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    user_data = user.dict(exclude_unset=True)
    for key, value in user_data.items():
        setattr(db_user, key, value)
    session.add(db_user)
    try:
        session.commit()
        session.refresh(db_user)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="User update failed") from e
    # Broadcast data update
    asyncio.create_task(
        manager.broadcast(
            json.dumps(
                {
                    "type": "data_update",
                    "action": "update",
                    "entity": "user",
                    "id": db_user.id,
                }
            )
        )
    )
    return db_user


@router.delete("/users/{user_id}")
def delete_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(user)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="User deletion failed") from e
    # Broadcast data update
    asyncio.create_task(
        manager.broadcast(
            json.dumps(
                {
                    "type": "data_update",
                    "action": "delete",
                    "entity": "user",
                    "id": user_id,
                }
            )
        )
    )
    return {"ok": True}
