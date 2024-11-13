import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.databases.database import get_session
from app.models import Column, LinkTable, Table
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.schema import (
    ColumnCreate,
    ColumnRead,
    ColumnSchema,
    LinkColumnSchema,
    LinkTableSchema,
    SchemaResponse,
    TableCreate,
    TableRead,
    TableSchema,
)
from app.utils.elasticsearch import index_existing_records
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
    db_table = Table(
        name=table.name,
        display_format=table.display_format,
        display_format_secondary=table.display_format_secondary,
    )
    session.add(db_table)
    try:
        session.commit()
        session.refresh(db_table)
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


@router.put("/tables/{table_id}/", response_model=TableRead)
def update_table_endpoint(
    table_id: int,
    table: TableCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    db_table = session.get(Table, table_id)
    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")

    # Check if display formats are changed
    display_format_changed = db_table.display_format != table.display_format
    display_format_secondary_changed = (
        db_table.display_format_secondary != table.display_format_secondary
    )

    db_table.name = table.name
    db_table.display_format = table.display_format
    db_table.display_format_secondary = table.display_format_secondary

    session.add(db_table)
    try:
        session.commit()
        session.refresh(db_table)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Table update failed") from e
    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "update_table",
                "table": db_table.name,
            }
        ),
    )

    # Reindex records if display formats have changed
    if display_format_changed or display_format_secondary_changed:
        background_tasks.add_task(index_existing_records, db_table.id)

    return db_table


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

    # Handle reference columns
    reference_table_id = None
    reference_link_table_id = None
    if column.data_type == "reference":
        if column.reference_table_id:
            reference_table = session.get(Table, column.reference_table_id)
            if not reference_table:
                raise HTTPException(status_code=404, detail="Reference table not found")
            reference_table_id = column.reference_table_id
        elif column.reference_link_table_id:
            reference_link_table = session.get(
                LinkTable, column.reference_link_table_id
            )
            if not reference_link_table:
                raise HTTPException(
                    status_code=404, detail="Reference link table not found"
                )
            reference_link_table_id = column.reference_link_table_id
        else:
            raise HTTPException(
                status_code=400,
                detail="Reference table ID or reference link table ID must be set for reference columns.",
            )

    db_column = Column(
        table_id=table_id,
        name=column.name,
        data_type=column.data_type,
        is_list=column.is_list,
        constraints=constraints_str,
        required=column.required,
        unique=column.unique,
        enum_id=column.enum_id,
        searchable=column.searchable,
        reference_table_id=reference_table_id,
        reference_link_table_id=reference_link_table_id,
    )
    session.add(db_column)
    try:
        session.commit()
        session.refresh(db_column)
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
    if db_column.searchable:
        # Index existing records
        background_tasks.add_task(index_existing_records, table_id, db_column.name)

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
    columns = (
        session.exec(
            select(Column)
            .options(
                selectinload(Column.reference_table),
                selectinload(Column.reference_link_table),
            )
            .where(Column.table_id == table_id)
        )
        .unique()
        .all()
    )
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

    previous_searchable = db_column.searchable

    # Update fields
    db_column.name = column.name
    db_column.data_type = column.data_type
    db_column.is_list = column.is_list  # Update is_list flag
    db_column.constraints = constraints_str
    db_column.required = column.required
    db_column.unique = column.unique
    db_column.enum_id = column.enum_id
    db_column.searchable = column.searchable

    session.add(db_column)
    try:
        session.commit()
        session.refresh(db_column)
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

    if not previous_searchable and db_column.searchable:
        background_tasks.add_task(
            index_existing_records, db_column.table_id, db_column.name
        )

    return db_column


@router.get("/current_schema/", response_model=SchemaResponse)
def get_current_schema(
    *,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # Fetch all tables
    tables = session.exec(select(Table)).all()

    # Build the schema dictionary
    schema = {}

    for table in tables:
        # Eagerly load relationships using selectinload
        table_columns = (
            session.exec(
                select(Column)
                .options(
                    selectinload(Column.reference_table),
                    selectinload(Column.reference_link_table),
                )
                .where(Column.table_id == table.id)
            )
            .unique()
            .all()
        )

        # For each table, get its columns
        columns = []
        for column in table_columns:
            reference_table_name = None
            if column.data_type == "reference" and column.reference_table:
                reference_table_name = column.reference_table.name

            column_schema = ColumnSchema(
                id=column.id,
                name=column.name,
                data_type=column.data_type,
                is_list=column.is_list,
                constraints=column.constraints,
                enum_id=column.enum_id,
                required=column.required,
                unique=column.unique,
                searchable=column.searchable,
                reference_link_table_id=column.reference_link_table_id,
                reference_table=reference_table_name,
            )
            columns.append(column_schema)

        # Get link tables associated with this table
        link_tables_stmt = (
            select(LinkTable)
            .options(selectinload(LinkTable.columns))
            .where(
                (LinkTable.from_table_id == table.id)
                | (LinkTable.to_table_id == table.id)
            )
        )
        link_tables = session.exec(link_tables_stmt).unique().all()

        # For each link table, get its columns
        link_tables_info = []
        for lt in link_tables:
            lt_columns = [
                LinkColumnSchema(
                    id=lc.id,
                    name=lc.name,
                    data_type=lc.data_type,
                    is_list=lc.is_list,
                    constraints=lc.constraints,
                    enum_id=lc.enum_id,
                    required=lc.required,
                    unique=lc.unique,
                )
                for lc in lt.columns
            ]
            lt_info = LinkTableSchema(
                id=lt.id,
                name=lt.name,
                from_table=lt.from_table.name,
                to_table=lt.to_table.name,
                columns=lt_columns,
            )
            link_tables_info.append(lt_info)

        schema[table.name] = TableSchema(
            id=table.id,
            columns=columns,
            link_tables=link_tables_info,
            display_format=table.display_format,
            display_format_secondary=table.display_format_secondary,
        )

    return SchemaResponse(data_schema=schema)
