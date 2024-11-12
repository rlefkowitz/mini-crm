import json
from datetime import datetime, timezone
from typing import Any, List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.databases.database import get_session
from app.models.link import LinkColumn, LinkRecord, LinkTable
from app.models.record import Record
from app.models.schema import Table
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.link import (
    LinkColumnCreate,
    LinkColumnRead,
    LinkRecordCreate,
    LinkRecordRead,
    LinkTableCreate,
    LinkTableRead,
)
from app.websocket import manager

router = APIRouter()


# Link Table Endpoints


@router.post("/link_tables/", response_model=LinkTableRead)
def create_link_table(
    link_table: LinkTableCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # Check if link table with the same name already exists
    existing_link_table = session.exec(
        select(LinkTable).where(LinkTable.name == link_table.name)
    ).first()
    if existing_link_table:
        raise HTTPException(
            status_code=400, detail="Link table with this name already exists"
        )

    # Verify that from_table and to_table exist
    from_table = session.get(Table, link_table.from_table_id)
    to_table = session.get(Table, link_table.to_table_id)
    if not from_table or not to_table:
        raise HTTPException(status_code=404, detail="One or both tables not found")

    # Create LinkTable
    db_link_table = LinkTable(
        name=link_table.name,
        from_table_id=link_table.from_table_id,
        to_table_id=link_table.to_table_id,
    )
    session.add(db_link_table)
    try:
        session.commit()
        session.refresh(db_link_table)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Link table creation failed") from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "create_link_table",
                "link_table": db_link_table.name,
            }
        ),
    )

    return db_link_table


@router.get("/link_tables/", response_model=List[LinkTableRead])
def read_link_tables(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    link_tables = session.exec(
        select(LinkTable).options(
            selectinload(LinkTable.from_table),
            selectinload(LinkTable.to_table),
            selectinload(LinkTable.columns),
        )
    ).all()
    return link_tables


@router.get("/link_tables/{link_table_id}", response_model=LinkTableRead)
def read_link_table(
    link_table_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    link_table = session.exec(
        select(LinkTable)
        .where(LinkTable.id == link_table_id)
        .options(
            selectinload(LinkTable.from_table),
            selectinload(LinkTable.to_table),
            selectinload(LinkTable.columns),
        )
    ).first()
    if not link_table:
        raise HTTPException(status_code=404, detail="Link table not found")
    return link_table


@router.put("/link_tables/{link_table_id}/", response_model=LinkTableRead)
def update_link_table(
    link_table_id: int,
    link_table: LinkTableCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    db_link_table = session.get(LinkTable, link_table_id)
    if not db_link_table:
        raise HTTPException(status_code=404, detail="Link table not found")

    # Verify that from_table and to_table exist
    from_table = session.get(Table, link_table.from_table_id)
    to_table = session.get(Table, link_table.to_table_id)
    if not from_table or not to_table:
        raise HTTPException(status_code=404, detail="One or both tables not found")

    # Update fields
    db_link_table.name = link_table.name
    db_link_table.from_table_id = link_table.from_table_id
    db_link_table.to_table_id = link_table.to_table_id

    session.add(db_link_table)
    try:
        session.commit()
        session.refresh(db_link_table)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Link table update failed") from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "update_link_table",
                "link_table": db_link_table.name,
            }
        ),
    )

    return db_link_table


@router.delete("/link_tables/{link_table_id}")
def delete_link_table(
    link_table_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    link_table = session.get(LinkTable, link_table_id)
    if not link_table:
        raise HTTPException(status_code=404, detail="Link table not found")
    link_table_name = link_table.name
    session.delete(link_table)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Link table deletion failed") from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "delete_link_table",
                "link_table": link_table_name,
            }
        ),
    )

    return {"ok": True}


# Link Column Endpoints


@router.post("/link_tables/{link_table_id}/columns/", response_model=LinkColumnRead)
def create_link_column(
    link_table_id: int,
    column: LinkColumnCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    link_table = session.get(LinkTable, link_table_id)
    if not link_table:
        raise HTTPException(status_code=404, detail="Link table not found")
    # Check if column already exists
    existing_column = session.exec(
        select(LinkColumn).where(
            LinkColumn.link_table_id == link_table_id, LinkColumn.name == column.name
        )
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

    db_column = LinkColumn(
        link_table_id=link_table_id,
        name=column.name,
        data_type=column.data_type,
        constraints=constraints_str,
        required=column.required,
        unique=column.unique,
        enum_id=column.enum_id,
    )
    session.add(db_column)
    try:
        session.commit()
        session.refresh(db_column)
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Link column creation failed"
        ) from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "create_link_column",
                "link_table": link_table.name,
                "column": db_column.name,
            }
        ),
    )

    return db_column


@router.get(
    "/link_tables/{link_table_id}/columns/", response_model=List[LinkColumnRead]
)
def read_link_columns(
    link_table_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    link_table = session.get(LinkTable, link_table_id)
    if not link_table:
        raise HTTPException(status_code=404, detail="Link table not found")
    columns = session.exec(
        select(LinkColumn).where(LinkColumn.link_table_id == link_table_id)
    ).all()
    return columns


@router.get("/link_columns/{column_id}", response_model=LinkColumnRead)
def read_link_column(
    column_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    column = session.get(LinkColumn, column_id)
    if not column:
        raise HTTPException(status_code=404, detail="Link column not found")
    return column


@router.put("/link_columns/{column_id}/", response_model=LinkColumnRead)
def update_link_column(
    column_id: int,
    column: LinkColumnCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    db_column = session.get(LinkColumn, column_id)
    if not db_column:
        raise HTTPException(status_code=404, detail="Link column not found")

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

    session.add(db_column)
    try:
        session.commit()
        session.refresh(db_column)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Link column update failed") from e

    # Broadcast schema update
    link_table = session.get(LinkTable, db_column.link_table_id)
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "update_link_column",
                "link_table": link_table.name,
                "column": db_column.name,
            }
        ),
    )

    return db_column


@router.delete("/link_columns/{column_id}")
def delete_link_column(
    column_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    column = session.get(LinkColumn, column_id)
    if not column:
        raise HTTPException(status_code=404, detail="Link column not found")
    link_table = session.get(LinkTable, column.link_table_id)
    column_name = column.name
    session.delete(column)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Link column deletion failed"
        ) from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "delete_link_column",
                "link_table": link_table.name,
                "column": column_name,
            }
        ),
    )

    return {"ok": True}


# Link Record Endpoints


@router.post("/link_tables/{link_table_id}/records/", response_model=LinkRecordRead)
def create_link_record(
    link_table_id: int,
    record: LinkRecordCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    link_table = session.get(LinkTable, link_table_id)
    if not link_table:
        raise HTTPException(status_code=404, detail="Link table not found")

    from_record = session.get(Record, record.from_record_id)
    to_record = session.get(Record, record.to_record_id)
    if not from_record or not to_record:
        raise HTTPException(status_code=404, detail="One or both records not found")
    if from_record.table_id != link_table.from_table_id:
        raise HTTPException(
            status_code=400,
            detail="From record does not belong to the from_table of the link_table",
        )
    if to_record.table_id != link_table.to_table_id:
        raise HTTPException(
            status_code=400,
            detail="To record does not belong to the to_table of the link_table",
        )

    db_record = LinkRecord(
        link_table_id=link_table_id,
        from_record_id=record.from_record_id,
        to_record_id=record.to_record_id,
        data=record.data,
    )
    session.add(db_record)
    try:
        session.commit()
        session.refresh(db_record)
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Link record creation failed"
        ) from e

    # Broadcast data update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "data_update",
                "action": "create_link_record",
                "link_table": link_table.name,
                "id": db_record.id,
            }
        ),
    )
    return db_record


@router.get(
    "/link_tables/{link_table_id}/records/", response_model=List[LinkRecordRead]
)
def read_link_records(
    link_table_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    link_table = session.get(LinkTable, link_table_id)
    if not link_table:
        raise HTTPException(status_code=404, detail="Link table not found")
    records = session.exec(
        select(LinkRecord).where(LinkRecord.link_table_id == link_table_id)
    ).all()
    return records


@router.get("/link_records/{record_id}", response_model=LinkRecordRead)
def read_link_record(
    record_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    record = session.get(LinkRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Link record not found")
    return record


@router.put("/link_records/{record_id}/", response_model=LinkRecordRead)
def update_link_record(
    record_id: int,
    record: LinkRecordCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    db_record = session.get(LinkRecord, record_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Link record not found")

    link_table = session.get(LinkTable, db_record.link_table_id)
    if not link_table:
        raise HTTPException(status_code=404, detail="Link table not found")

    from_record = session.get(Record, record.from_record_id)
    to_record = session.get(Record, record.to_record_id)
    if not from_record or not to_record:
        raise HTTPException(status_code=404, detail="One or both records not found")
    if from_record.table_id != link_table.from_table_id:
        raise HTTPException(
            status_code=400,
            detail="From record does not belong to the from_table of the link_table",
        )
    if to_record.table_id != link_table.to_table_id:
        raise HTTPException(
            status_code=400,
            detail="To record does not belong to the to_table of the link_table",
        )

    # Update fields
    db_record.from_record_id = record.from_record_id
    db_record.to_record_id = record.to_record_id
    db_record.data = record.data
    db_record.updated_at = datetime.now(timezone.utc)

    session.add(db_record)
    try:
        session.commit()
        session.refresh(db_record)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Link record update failed") from e

    # Broadcast data update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "data_update",
                "action": "update_link_record",
                "link_table": link_table.name,
                "id": db_record.id,
            }
        ),
    )

    return db_record


@router.delete("/link_records/{record_id}")
def delete_link_record(
    record_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    record = session.get(LinkRecord, record_id)
    if not record:
        raise HTTPException(status_code=404, detail="Link record not found")
    link_table = session.get(LinkTable, record.link_table_id)
    record_id = record.id
    session.delete(record)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Link record deletion failed"
        ) from e

    # Broadcast data update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "data_update",
                "action": "delete_link_record",
                "link_table": link_table.name,
                "id": record_id,
            }
        ),
    )

    return {"ok": True}
