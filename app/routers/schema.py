import json
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, select

from app.databases.database import get_session
from app.models import Column, EnumModel, Table
from app.models.relationship import RelationshipModel
from app.models.schema import Column, Table
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.schema import ColumnCreate, ColumnRead, TableCreate, TableRead
from app.websocket import manager

router = APIRouter()


@router.post("/tables/", response_model=TableRead)
def create_table_endpoint(
    table: TableCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    existing_table = session.exec(select(Table).where(Table.name == table.name)).first()
    if existing_table:
        raise HTTPException(
            status_code=400, detail="Table with this name already exists"
        )
    db_table = Table(name=table.name)
    session.add(db_table)
    try:
        session.commit()
        session.refresh(db_table)
        # Alembic handles migrations, so no need to call create_table here
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Table creation failed") from e
    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "create_table",
                "table": db_table.name,
            }
        ),
    )
    return db_table


@router.get("/tables/", response_model=list[TableRead])
def read_tables(
    session: Session = Depends(get_session), user: User = Depends(get_current_user)
):
    tables = session.exec(select(Table)).all()
    return tables


@router.delete("/tables/{table_id}")
def delete_table_endpoint(
    table_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    table = session.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    table_name = table.name
    session.delete(table)
    try:
        session.commit()
        # Alembic handles migrations, so no need to call drop_table here
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Table deletion failed") from e
    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "delete_table",
                "table": table_name,
            }
        ),
    )
    return {"ok": True}


# Column CRUD
@router.post("/tables/{table_id}/columns/", response_model=ColumnRead)
def create_column_endpoint(
    table_id: int,
    column: ColumnCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    table = session.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    # Check if column already exists
    existing_column = session.exec(
        select(Column).where(Column.table_id == table_id, Column.name == column.name)
    ).first()
    if existing_column:
        raise HTTPException(status_code=400, detail="Column already exists")
    # Build constraints string based on 'required' and 'unique'
    constraints = []
    if column.required:
        constraints.append("NOT NULL")
    if column.unique:
        constraints.append("UNIQUE")
    if column.constraints:
        constraints.append(column.constraints)
    constraints_str = " ".join(constraints) if constraints else None

    db_column = Column(
        table_id=table_id,
        name=column.name,
        data_type=column.data_type,
        constraints=constraints_str,
        required=column.required,
        unique=column.unique,
        enum_id=column.enum_id,
        searchable=column.searchable,  # Handle searchable flag
    )
    session.add(db_column)
    try:
        session.commit()
        session.refresh(db_column)
        # Alembic handles migrations, so no need to call add_column here
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Column creation failed") from e
    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "create_column",
                "table": table.name,
                "column": db_column.name,
                "searchable": db_column.searchable,
            }
        ),
    )
    return db_column


@router.get("/tables/{table_id}/columns/", response_model=list[ColumnRead])
def read_columns(
    table_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    table = session.get(Table, table_id)
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    columns = session.exec(select(Column).where(Column.table_id == table_id)).all()
    return columns


@router.delete("/columns/{column_id}")
def delete_column_endpoint(
    column_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    column = session.get(Column, column_id)
    if not column:
        raise HTTPException(status_code=404, detail="Column not found")
    table = session.get(Table, column.table_id)
    column_name = column.name
    session.delete(column)
    try:
        session.commit()
        # Alembic handles migrations, so no need to call drop_column here
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Column deletion failed") from e
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "delete_column",
                "table": table.name,
                "column": column_name,
            }
        ),
    )
    return {"ok": True}


@router.put("/columns/{column_id}/", response_model=ColumnRead)
def update_column_endpoint(
    column_id: int,
    column: ColumnCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    db_column = session.get(Column, column_id)
    if not db_column:
        raise HTTPException(status_code=404, detail="Column not found")

    # Build constraints string based on 'required' and 'unique'
    constraints = []
    if column.required:
        constraints.append("NOT NULL")
    if column.unique:
        constraints.append("UNIQUE")
    if column.constraints:
        constraints.append(column.constraints)
    constraints_str = " ".join(constraints) if constraints else None

    # Update fields
    db_column.name = column.name
    db_column.data_type = column.data_type
    db_column.constraints = constraints_str
    db_column.required = column.required
    db_column.unique = column.unique
    db_column.enum_id = column.enum_id
    db_column.searchable = column.searchable  # Update searchable flag

    session.add(db_column)
    try:
        session.commit()
        session.refresh(db_column)
        # Alembic handles migrations, so no need to call update_column here
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Column update failed") from e

    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "update_column",
                "table": db_column.table.name,
                "column": db_column.name,
                "searchable": db_column.searchable,
            }
        ),
    )

    return db_column


@router.get("/current_schema/", response_model=dict[str, Any])
def get_current_schema(session: Session = Depends(get_session)):
    try:
        schema = {}
        tables = session.exec(select(Table)).all()
        for table in tables:
            table_info = {
                "id": table.id,
                "name": table.name,
                "columns": [],
                "relationships_from": [],
                "relationships_to": [],
                "records": [],
            }

            # Columns
            for column in table.columns:
                column_info = {
                    "id": column.id,
                    "name": column.name,
                    "data_type": column.data_type,
                    "constraints": column.constraints,
                    "enum_id": column.enum_id,
                    "required": column.required,
                    "unique": column.unique,
                    "searchable": column.searchable,
                    "created_at": column.created_at.isoformat(),
                    "updated_at": column.updated_at.isoformat(),
                }
                table_info["columns"].append(column_info)

            # Relationships From
            for rel in table.relationships_from:
                rel_info = {
                    "id": rel.id,
                    "name": rel.name,
                    "relationship_type": rel.relationship_type.value,
                    "to_table_id": rel.to_table_id,
                    "attributes": [
                        {
                            "id": attr.id,
                            "name": attr.name,
                            "data_type": attr.data_type,
                            "constraints": attr.constraints,
                        }
                        for attr in rel.relationship_attributes
                    ],
                    "junctions": [
                        {
                            "id": junction.id,
                            "relationship_id": junction.relationship_id,
                            "from_record_id": junction.from_record_id,
                            "to_record_id": junction.to_record_id,
                            "attributes": junction.attributes,  # Already a dict
                        }
                        for junction in rel.junctions
                    ],
                }
                table_info["relationships_from"].append(rel_info)

            # Relationships To
            for rel in table.relationships_to:
                rel_info = {
                    "id": rel.id,
                    "name": rel.name,
                    "relationship_type": rel.relationship_type.value,
                    "from_table_id": rel.from_table_id,
                    "attributes": [
                        {
                            "id": attr.id,
                            "name": attr.name,
                            "data_type": attr.data_type,
                            "constraints": attr.constraints,
                        }
                        for attr in rel.relationship_attributes
                    ],
                    "junctions": [
                        {
                            "id": junction.id,
                            "relationship_id": junction.relationship_id,
                            "from_record_id": junction.from_record_id,
                            "to_record_id": junction.to_record_id,
                            "attributes": junction.attributes,  # Already a dict
                        }
                        for junction in rel.junctions
                    ],
                }
                table_info["relationships_to"].append(rel_info)

            # Records
            for record in table.records:
                record_info = {
                    "id": record.id,
                    "table_id": record.table_id,
                    "data": record.data,
                    "created_at": record.created_at.isoformat(),
                    "updated_at": record.updated_at.isoformat(),
                    "from_relationships": [
                        {
                            "id": junction.id,
                            "relationship_id": junction.relationship_id,
                            "to_record_id": junction.to_record_id,
                            "attributes": junction.attributes,  # Already a dict
                        }
                        for junction in record.from_relationships
                    ],
                    "to_relationships": [
                        {
                            "id": junction.id,
                            "relationship_id": junction.relationship_id,
                            "from_record_id": junction.from_record_id,
                            "attributes": junction.attributes,  # Already a dict
                        }
                        for junction in record.to_relationships
                    ],
                }
                table_info["records"].append(record_info)

            schema[table.name] = table_info

        # Enums
        enums = session.exec(select(EnumModel)).all()
        enum_info = {}
        for enum in enums:
            enum_info[enum.name] = {
                "id": enum.id,
                "name": enum.name,
                "values": [value.value for value in enum.values],
                "columns": [column.name for column in enum.columns],
            }

        return {"tables": schema, "enums": enum_info}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
