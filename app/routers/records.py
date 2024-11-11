import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.databases.database import get_session
from app.models.enum import EnumModel
from app.models.record import Record
from app.models.relationship import RelationshipModel
from app.models.relationship_junction import RelationshipJunctionModel
from app.models.schema import Column, Table
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.schema import RecordCreate, RecordRead
from app.utils.elasticsearch import index_record, remove_record_from_index
from app.websocket import manager

router = APIRouter()


def validate_record_data(table: Table, data: dict[str, Any], session: Session):
    """
    Validates the incoming record data against the table's column definitions.
    """
    errors = []

    columns = session.exec(select(Column).where(Column.table_id == table.id)).all()
    column_dict = {col.name: col for col in columns}

    # Check for required fields
    for col in columns:
        if col.required and col.name not in data:
            errors.append(f"Missing required field: {col.name}")

    # Validate data types and constraints
    for key, value in data.items():
        if key not in column_dict:
            errors.append(f"Invalid field: {key}")
            continue

        col = column_dict[key]
        # Type Validation
        if col.data_type.lower() == "integer":
            if not isinstance(value, int):
                errors.append(f"Field '{key}' must be an integer.")
        elif col.data_type.lower() == "currency":
            if not isinstance(value, (int, float)):
                errors.append(f"Field '{key}' must be a number.")
        elif col.data_type.lower() in ["string", "enum", "picklist"]:
            if not isinstance(value, str):
                errors.append(f"Field '{key}' must be a string.")
        else:
            # Add more data type validations as needed
            pass

        # Unique Constraint
        if col.unique:
            existing_record = session.exec(
                select(Record).where(
                    Record.table_id == table.id, Record.data[key] == value
                )
            ).first()
            if existing_record and existing_record.id != data.get("id"):
                errors.append(
                    f"Field '{key}' must be unique. Value '{value}' already exists."
                )

        # Enum Validation
        if col.data_type.lower() == "enum" and col.enum_id:
            enum = session.get(EnumModel, col.enum_id)
            if not enum:
                errors.append(f"Enum for column '{key}' not found.")
                continue
            allowed_values = {v.value for v in enum.values}
            if value not in allowed_values:
                errors.append(
                    f"Field '{key}' has invalid enum value: '{value}'. Allowed values: {allowed_values}"
                )

    if errors:
        raise HTTPException(status_code=400, detail=errors)


@router.post("/records/{table_name}/", response_model=RecordRead)
def create_record(
    table_name: str,
    record: RecordCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    table = session.exec(select(Table).where(Table.name == table_name)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    # Validate incoming data
    validate_record_data(table, record.data, session)

    db_record = Record(table_id=table.id, data=record.data)
    session.add(db_record)
    try:
        session.commit()
        session.refresh(db_record)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Record creation failed") from e

    # Handle Relationships
    relationships = session.exec(
        select(RelationshipModel).where(RelationshipModel.from_table_id == table.id)
    ).all()
    for rel in relationships:
        related_data = record.data.get(rel.name)
        if related_data:
            if rel.relationship_type == "many_to_many":
                # related_data should be a list of dictionaries with 'to_record_id' and any attributes
                if not isinstance(related_data, list):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Relationship '{rel.name}' expects a list of related records.",
                    )
                for item in related_data:
                    to_record_id = item.get("to_record_id")
                    attributes = {k: v for k, v in item.items() if k != "to_record_id"}
                    # Validate that the to_record exists
                    to_record = session.get(Record, to_record_id)
                    if not to_record or to_record.table_id != rel.to_table_id:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Related record with id {to_record_id} does not exist in table '{rel.to_table_id}'.",
                        )
                    # Create RelationshipJunctionModel
                    junction = RelationshipJunctionModel(
                        relationship_id=rel.id,
                        from_record_id=db_record.id,
                        to_record_id=to_record_id,
                        attributes=attributes,
                    )
                    session.add(junction)
            elif rel.relationship_type == "one_to_many":
                # related_data should be a list of dictionaries with 'to_record_id' and any attributes
                if not isinstance(related_data, list):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Relationship '{rel.name}' expects a list of related records.",
                    )
                for item in related_data:
                    to_record_id = item.get("to_record_id")
                    attributes = {k: v for k, v in item.items() if k != "to_record_id"}
                    # Validate that the to_record exists
                    to_record = session.get(Record, to_record_id)
                    if not to_record or to_record.table_id != rel.to_table_id:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Related record with id {to_record_id} does not exist in table '{rel.to_table_id}'.",
                        )
                    # Create RelationshipJunctionModel
                    junction = RelationshipJunctionModel(
                        relationship_id=rel.id,
                        from_record_id=db_record.id,
                        to_record_id=to_record_id,
                        attributes=attributes,
                    )
                    session.add(junction)
            elif rel.relationship_type == "one_to_one":
                # related_data should be a single dictionary with 'to_record_id' and any attributes
                if not isinstance(related_data, dict):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Relationship '{rel.name}' expects a single related record.",
                    )
                to_record_id = related_data.get("to_record_id")
                attributes = {
                    k: v for k, v in related_data.items() if k != "to_record_id"
                }
                # Validate that the to_record exists
                to_record = session.get(Record, to_record_id)
                if not to_record or to_record.table_id != rel.to_table_id:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Related record with id {to_record_id} does not exist in table '{rel.to_table_id}'.",
                    )
                # Check if a relationship already exists
                existing_junction = session.exec(
                    select(RelationshipJunctionModel).where(
                        RelationshipJunctionModel.relationship_id == rel.id,
                        RelationshipJunctionModel.from_record_id == db_record.id,
                    )
                ).first()
                if existing_junction:
                    raise HTTPException(
                        status_code=400,
                        detail=f"One-to-one relationship '{rel.name}' already exists for this record.",
                    )
                # Create RelationshipJunctionModel
                junction = RelationshipJunctionModel(
                    relationship_id=rel.id,
                    from_record_id=db_record.id,
                    to_record_id=to_record_id,
                    attributes=attributes,
                )
                session.add(junction)

    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Record creation with relationships failed"
        ) from e

    # Index in Elasticsearch if any searchable fields
    columns = session.exec(select(Column).where(Column.table_id == table.id)).all()
    searchable_fields = [col.name for col in columns if col.searchable]
    searchable_data = {
        key: value for key, value in record.data.items() if key in searchable_fields
    }
    if searchable_data:
        background_tasks.add_task(index_record, db_record, searchable_data)

    # Broadcast data update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "data_update",
                "action": "create",
                "table": table_name,
                "id": db_record.id,
            }
        ),
    )
    return db_record


@router.get("/records/{table_name}/", response_model=list[RecordRead])
def read_records(
    table_name: str,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    table = session.exec(select(Table).where(Table.name == table_name)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    records = session.exec(select(Record).where(Record.table_id == table.id)).all()
    return records


@router.put("/records/{table_name}/{record_id}/", response_model=RecordRead)
def update_record(
    table_name: str,
    record_id: int,
    record: RecordCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    table = session.exec(select(Table).where(Table.name == table_name)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    db_record = session.exec(
        select(Record).where(Record.id == record_id, Record.table_id == table.id)
    ).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Record not found")

    # Validate incoming data
    validate_record_data(table, record.data, session)

    # Update fields
    db_record.data.update(record.data)
    db_record.updated_at = datetime.now(timezone.utc)
    session.add(db_record)
    try:
        session.commit()
        session.refresh(db_record)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Record update failed") from e

    # Handle Relationships
    relationships = session.exec(
        select(RelationshipModel).where(RelationshipModel.from_table_id == table.id)
    ).all()
    for rel in relationships:
        related_data = record.data.get(rel.name)
        if related_data is not None:
            if rel.relationship_type == "many_to_many":
                # Clear existing relationships
                session.exec(
                    select(RelationshipJunctionModel).where(
                        RelationshipJunctionModel.relationship_id == rel.id,
                        RelationshipJunctionModel.from_record_id == db_record.id,
                    )
                ).delete(synchronize_session=False)
                # related_data should be a list of dictionaries with 'to_record_id' and any attributes
                if not isinstance(related_data, list):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Relationship '{rel.name}' expects a list of related records.",
                    )
                for item in related_data:
                    to_record_id = item.get("to_record_id")
                    attributes = {k: v for k, v in item.items() if k != "to_record_id"}
                    # Validate that the to_record exists
                    to_record = session.get(Record, to_record_id)
                    if not to_record or to_record.table_id != rel.to_table_id:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Related record with id {to_record_id} does not exist in table '{rel.to_table_id}'.",
                        )
                    # Create RelationshipJunctionModel
                    junction = RelationshipJunctionModel(
                        relationship_id=rel.id,
                        from_record_id=db_record.id,
                        to_record_id=to_record_id,
                        attributes=attributes,
                    )
                    session.add(junction)
            elif rel.relationship_type == "one_to_many":
                # Clear existing relationships
                session.exec(
                    select(RelationshipJunctionModel).where(
                        RelationshipJunctionModel.relationship_id == rel.id,
                        RelationshipJunctionModel.from_record_id == db_record.id,
                    )
                ).delete(synchronize_session=False)
                # related_data should be a list of dictionaries with 'to_record_id' and any attributes
                if not isinstance(related_data, list):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Relationship '{rel.name}' expects a list of related records.",
                    )
                for item in related_data:
                    to_record_id = item.get("to_record_id")
                    attributes = {k: v for k, v in item.items() if k != "to_record_id"}
                    # Validate that the to_record exists
                    to_record = session.get(Record, to_record_id)
                    if not to_record or to_record.table_id != rel.to_table_id:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Related record with id {to_record_id} does not exist in table '{rel.to_table_id}'.",
                        )
                    # Create RelationshipJunctionModel
                    junction = RelationshipJunctionModel(
                        relationship_id=rel.id,
                        from_record_id=db_record.id,
                        to_record_id=to_record_id,
                        attributes=attributes,
                    )
                    session.add(junction)
            elif rel.relationship_type == "one_to_one":
                # related_data should be a single dictionary with 'to_record_id' and any attributes
                if not isinstance(related_data, dict):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Relationship '{rel.name}' expects a single related record.",
                    )
                to_record_id = related_data.get("to_record_id")
                attributes = {
                    k: v for k, v in related_data.items() if k != "to_record_id"
                }
                # Validate that the to_record exists
                to_record = session.get(Record, to_record_id)
                if not to_record or to_record.table_id != rel.to_table_id:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Related record with id {to_record_id} does not exist in table '{rel.to_table_id}'.",
                    )
                # Check if a relationship already exists
                existing_junction = session.exec(
                    select(RelationshipJunctionModel).where(
                        RelationshipJunctionModel.relationship_id == rel.id,
                        RelationshipJunctionModel.from_record_id == db_record.id,
                    )
                ).first()
                if existing_junction:
                    # Update existing junction
                    existing_junction.to_record_id = to_record_id
                    existing_junction.attributes = attributes
                    session.add(existing_junction)
                else:
                    # Create new junction
                    junction = RelationshipJunctionModel(
                        relationship_id=rel.id,
                        from_record_id=db_record.id,
                        to_record_id=to_record_id,
                        attributes=attributes,
                    )
                    session.add(junction)

    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Record update with relationships failed"
        ) from e

    # Re-index in Elasticsearch if any searchable fields are updated
    columns = session.exec(select(Column).where(Column.table_id == table.id)).all()
    searchable_fields = [col.name for col in columns if col.searchable]
    searchable_data = {
        key: value for key, value in record.data.items() if key in searchable_fields
    }
    if searchable_data:
        background_tasks.add_task(index_record, db_record, searchable_data)

    # Broadcast data update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "data_update",
                "action": "update",
                "table": table_name,
                "id": db_record.id,
            }
        ),
    )
    return db_record


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
    db_record = session.exec(
        select(Record).where(Record.id == record_id, Record.table_id == table.id)
    ).first()
    if not db_record:
        raise HTTPException(status_code=404, detail="Record not found")
    session.delete(db_record)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Record deletion failed") from e

    # Remove related relationship junctions
    session.exec(
        select(RelationshipJunctionModel).where(
            RelationshipJunctionModel.from_record_id == db_record.id
        )
    ).delete(synchronize_session=False)
    session.exec(
        select(RelationshipJunctionModel).where(
            RelationshipJunctionModel.to_record_id == db_record.id
        )
    ).delete(synchronize_session=False)
    session.commit()

    # Remove from Elasticsearch if indexed
    background_tasks.add_task(remove_record_from_index, db_record)

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


@router.get("/records/{table_name}/search/", response_model=list[RecordRead])
def search_records(
    table_name: str,
    query: str = Query(..., description="Search query"),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    table = session.exec(select(Table).where(Table.name == table_name)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")

    # Fetch searchable columns
    columns = session.exec(
        select(Column).where(Column.table_id == table.id, Column.searchable == True)
    ).all()
    searchable_fields = [col.name for col in columns]
    if not searchable_fields:
        raise HTTPException(
            status_code=400, detail="No searchable fields defined for this table"
        )

    # Perform search in Elasticsearch
    from app.utils.elasticsearch import es_client, get_index_name

    index_name = get_index_name(table.name)
    try:
        es_resp = es_client.search(
            index=index_name,
            body={
                "query": {"multi_match": {"query": query, "fields": searchable_fields}}
            },
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Search operation failed") from e

    hits = es_resp["hits"]["hits"]
    record_ids = [int(hit["_id"]) for hit in hits]

    # Fetch records from DB
    if not record_ids:
        return []

    records = session.exec(
        select(Record).where(Record.id.in_(record_ids), Record.table_id == table.id)
    ).all()
    return records
