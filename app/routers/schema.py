import asyncio
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlmodel import select

from app.database import get_session
from app.models.relationship import RelationshipModel
from app.models.schema import Column, Table
from app.schemas.schema import ColumnCreate, ColumnRead, TableCreate, TableRead
from app.utils.migration import add_column, create_table, drop_column, drop_table
from app.websocket import manager

router = APIRouter()


# Table CRUD
@router.post("/tables/", response_model=TableRead)
def create_table_endpoint(table: TableCreate, session: Session = Depends(get_session)):
    db_table = Table(name=table.name)
    session.add(db_table)
    try:
        session.commit()
        session.refresh(db_table)
        create_table(db_table.name)  # Apply migration
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Table creation failed") from e
    # Broadcast schema update
    asyncio.create_task(
        manager.broadcast(
            json.dumps(
                {
                    "type": "schema_update",
                    "action": "create_table",
                    "table": db_table.name,
                }
            )
        )
    )
    return db_table


@router.get("/tables/", response_model=list[TableRead])
def read_tables(session: Session = Depends(get_session)):
    tables = session.exec(select(Table)).all()
    return tables


@router.delete("/tables/{table_id}")
def delete_table_endpoint(table_id: int, session: Session = Depends(get_session)):
    table = session.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    table_name = table.name
    session.delete(table)
    try:
        session.commit()
        drop_table(table_name)  # Apply migration
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Table deletion failed") from e
    # Broadcast schema update
    asyncio.create_task(
        manager.broadcast(
            json.dumps(
                {
                    "type": "schema_update",
                    "action": "delete_table",
                    "table": table_name,
                }
            )
        )
    )
    return {"ok": True}


# Column CRUD
@router.post("/tables/{table_id}/columns/", response_model=ColumnRead)
def create_column_endpoint(
    table_id: int, column: ColumnCreate, session: Session = Depends(get_session)
):
    table = session.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    db_column = Column(
        table_id=table_id,
        name=column.name,
        data_type=column.data_type,
        constraints=column.constraints,
    )
    session.add(db_column)
    try:
        session.commit()
        session.refresh(db_column)
        add_column(
            table.name, db_column.name, db_column.data_type, db_column.constraints
        )  # Apply migration
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Column creation failed") from e
    # Broadcast schema update
    asyncio.create_task(
        manager.broadcast(
            json.dumps(
                {
                    "type": "schema_update",
                    "action": "create_column",
                    "table": table.name,
                    "column": db_column.name,
                }
            )
        )
    )
    return db_column


@router.get("/tables/{table_id}/columns/", response_model=list[ColumnRead])
def read_columns(table_id: int, session: Session = Depends(get_session)):
    table = session.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    columns = session.exec(select(Column).where(Column.table_id == table_id)).all()
    return columns


@router.delete("/columns/{column_id}")
def delete_column_endpoint(column_id: int, session: Session = Depends(get_session)):
    column = session.get(Column, column_id)
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    table = session.get(Table, column.table_id)
    column_name = column.name
    session.delete(column)
    try:
        session.commit()
        drop_column(table.name, column_name)  # Apply migration
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Column deletion failed") from e
    # Broadcast schema update
    asyncio.create_task(
        manager.broadcast(
            json.dumps(
                {
                    "type": "schema_update",
                    "action": "delete_column",
                    "table": table.name,
                    "column": column_name,
                }
            )
        )
    )
    return {"ok": True}


# Current Schema Endpoint
@router.get("/current_schema/")
def get_current_schema(session: Session = Depends(get_session)):
    tables = session.exec(select(Table)).all()
    relationships = session.exec(select(RelationshipModel)).all()
    schema = {}
    for table in tables:
        columns = session.exec(select(Column).where(Column.table_id == table.id)).all()
        schema[table.name] = {
            "columns": [
                {
                    "name": column.name,
                    "data_type": column.data_type,
                    "constraints": column.constraints,
                }
                for column in columns
            ],
            "relationships": {
                "from": [
                    {
                        "relationship": rel.name,
                        "to_table": session.get(Table, rel.to_table_id).name,
                        "attributes": (
                            json.loads(rel.attributes) if rel.attributes else []
                        ),
                    }
                    for rel in relationships
                    if rel.from_table_id == table.id
                ],
                "to": [
                    {
                        "relationship": rel.name,
                        "from_table": session.get(Table, rel.from_table_id).name,
                        "attributes": (
                            json.loads(rel.attributes) if rel.attributes else []
                        ),
                    }
                    for rel in relationships
                    if rel.to_table_id == table.id
                ],
            },
        }
    return schema
