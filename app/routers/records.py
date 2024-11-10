import asyncio
import json
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, select, text

from app.databases.database import get_session
from app.models.relationship import RelationshipAttribute, RelationshipModel
from app.models.schema import Column, Table
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.schema import ColumnRead
from app.websocket import manager

router = APIRouter()


@router.post("/records/{table_name}/")
def create_record(
    table_name: str,
    record: dict,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    table = session.exec(select(Table).where(Table.name == table_name)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    # Fetch columns
    columns = session.exec(select(Column).where(Column.table_id == table.id)).all()
    column_names = [col.name for col in columns]
    # Prepare insert data
    values = {k: v for k, v in record.items() if k in column_names}
    if not values:
        raise HTTPException(status_code=400, detail="No valid columns provided")
    columns_sql = ", ".join([f'"{k}"' for k in values.keys()])
    placeholders = ", ".join([f":{k}" for k in values.keys()])
    insert_stmt = f'INSERT INTO "{table_name}" ({columns_sql}) VALUES ({placeholders}) RETURNING id;'
    try:
        result = session.execute(text(insert_stmt), values).fetchone()
        session.commit()
        new_id = result[0]
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Record creation failed") from e
    # Broadcast data update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "data_update",
                "action": "create",
                "table": table_name,
                "id": new_id,
            }
        ),
    )
    return {"id": new_id}


@router.get("/records/{table_name}/", response_model=list[Any])
def read_records(
    table_name: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    table = session.exec(select(Table).where(Table.name == table_name)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    select_stmt = f'SELECT * FROM "{table_name}";'
    try:
        result = session.execute(text(select_stmt)).fetchall()
        records = [dict(row) for row in result]
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error fetching records") from e
    return records


@router.put("/records/{table_name}/{record_id}/")
def update_record(
    table_name: str,
    record_id: int,
    record: dict,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    table = session.exec(select(Table).where(Table.name == table_name)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    # Fetch columns
    columns = session.exec(select(Column).where(Column.table_id == table.id)).all()
    column_names = [col.name for col in columns]
    # Prepare update data
    values = {k: v for k, v in record.items() if k in column_names}
    if not values:
        raise HTTPException(status_code=400, detail="No valid columns provided")
    set_clause = ", ".join([f'"{k}" = :{k}' for k in values.keys()])
    update_stmt = f'UPDATE "{table_name}" SET {set_clause} WHERE id = :id;'
    values["id"] = record_id
    try:
        session.execute(text(update_stmt), values)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Record update failed") from e
    # Broadcast data update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "data_update",
                "action": "update",
                "table": table_name,
                "id": record_id,
            }
        ),
    )
    return {"ok": True}


@router.delete("/records/{table_name}/{record_id}/")
def delete_record(
    table_name: str,
    record_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    table = session.exec(select(Table).where(Table.name == table_name)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    delete_stmt = f'DELETE FROM "{table_name}" WHERE id = :id;'
    try:
        session.execute(text(delete_stmt), {"id": record_id})
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Record deletion failed") from e
    # Broadcast data update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "data_update",
                "action": "delete",
                "table": table_name,
                "id": record_id,
            }
        ),
    )
    return {"ok": True}
