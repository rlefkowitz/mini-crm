import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict

from dateutil.parser import parse as parse_date
from elasticsearch import exceptions as es_exceptions
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.databases.database import es, get_session
from app.models.enum import EnumModel
from app.models.link import LinkRecord, LinkTable
from app.models.record import Record
from app.models.schema import Column, Table
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.record import RecordCreate, RecordRead
from app.utils.elasticsearch import (
    get_index_name,
    index_record,
    remove_record_from_index,
)
from app.websocket import manager

log = logging.getLogger(__name__)

router = APIRouter()


def validate_record_data(
    table: Table,
    data: Dict[str, Any],
    link_data: Dict[str, Any],
    session: Session,
):
    """
    Validates the incoming record data against the table's column definitions.
    Also validates link data fields with additional attributes.
    """
    errors = []

    columns = session.exec(select(Column).where(Column.table_id == table.id)).all()
    column_dict = {col.name: col for col in columns}

    # Check for required fields
    for col in columns:
        if col.required and col.name not in data:
            errors.append(f"Missing required field: {col.name}")

    # Validate data types and constraints for main data
    for key, value in data.items():
        column = column_dict.get(key)
        if not column:
            errors.append(f"Invalid field: {key}")
            continue

        expected_type = column.data_type.lower()
        if expected_type == "integer":
            if not isinstance(value, int):
                errors.append(f"Field '{key}' must be an integer.")
        elif expected_type in ["float", "currency"]:
            if not isinstance(value, (int, float)):
                errors.append(f"Field '{key}' must be a number.")
        elif expected_type == "string":
            if not isinstance(value, str):
                errors.append(f"Field '{key}' must be a string.")
        elif expected_type == "boolean":
            if not isinstance(value, bool):
                errors.append(f"Field '{key}' must be a boolean.")
        elif expected_type == "date":
            if not isinstance(value, str):
                errors.append(f"Field '{key}' must be a date string in ISO format.")
                continue
            try:
                parse_date(value).date()
            except ValueError:
                errors.append(f"Field '{key}' has invalid date format: '{value}'.")
        elif expected_type == "datetime":
            if not isinstance(value, str):
                errors.append(f"Field '{key}' must be a datetime string in ISO format.")
                continue
            try:
                parse_date(value)
            except ValueError:
                errors.append(f"Field '{key}' has invalid datetime format: '{value}'.")
        elif expected_type in ["enum", "picklist"]:
            if not isinstance(value, str):
                errors.append(f"Field '{key}' must be a string.")
                continue
            if column.enum_id:
                enum = session.get(EnumModel, column.enum_id)
                if not enum:
                    errors.append(f"Enum for column '{key}' not found.")
                    continue
                allowed_values = {v.value for v in enum.values}
                if value not in allowed_values:
                    errors.append(
                        f"Field '{key}' has invalid enum value: '{value}'. Allowed values: {allowed_values}"
                    )
        elif expected_type == "reference":
            if column.is_list:
                if not isinstance(value, list):
                    errors.append(f"Field '{key}' must be a list of IDs.")
                else:
                    for item in value:
                        if not isinstance(item, int):
                            errors.append(f"All items in '{key}' must be integers.")
            else:
                if not isinstance(value, int):
                    errors.append(f"Field '{key}' must be an integer.")

    # Validate link data
    for key, value in link_data.items():
        column_name = key
        column = column_dict.get(column_name)
        if not column:
            errors.append(
                f"Invalid link data field '{key}': No corresponding column '{column_name}' found."
            )
            continue
        if not column.reference_link_table_id:
            errors.append(
                f"Column '{column_name}' does not have a reference_link_table_id set."
            )
            continue
        link_table = session.get(LinkTable, column.reference_link_table_id)
        if not link_table:
            errors.append(
                f"Link table with ID '{column.reference_link_table_id}' not found for column '{column_name}'."
            )
            continue

        # Normalize to list of dicts
        if isinstance(value, dict):
            link_data_list = [value]
        elif isinstance(value, list):
            link_data_list = value
        else:
            errors.append(
                f"Link data for '{key}' must be a dictionary or a list of dictionaries."
            )
            continue

        # Determine if the main field is singular or plural
        is_list = column.is_list
        main_field = column.name
        main_to_record_ids = []
        if is_list:
            main_to_record_ids = data.get(main_field, [])
            if not isinstance(main_to_record_ids, list):
                errors.append(
                    f"Field '{main_field}' is marked as a list but the provided value is not a list."
                )
                continue
        else:
            main_to_record_ids = [data.get(main_field)] if data.get(main_field) else []

        for idx, link_item in enumerate(link_data_list):
            if not isinstance(link_item, dict):
                errors.append(f"Each link data entry in '{key}' must be a dictionary.")
                continue

            # For singular references, ensure only one link data entry corresponds to the single main field
            if not is_list and idx > 0:
                errors.append(
                    f"Only one link data entry is allowed for '{key}' since it's not a list."
                )
                continue

            # For each link data, infer 'to_record_id' if not provided
            if not is_list and "to_record_id" not in link_item:
                if main_to_record_ids:
                    link_item["to_record_id"] = main_to_record_ids[0]
            elif is_list:
                if "to_record_id" not in link_item:
                    if idx < len(main_to_record_ids):
                        link_item["to_record_id"] = main_to_record_ids[idx]
                    else:
                        errors.append(
                            f"Missing 'to_record_id' in '{key}' at index {idx}."
                        )
                        continue

            if "to_record_id" not in link_item:
                errors.append(
                    f"Each link data entry in '{key}' must include 'to_record_id'."
                )
                continue

            to_record_id = link_item.get("to_record_id")
            if not isinstance(to_record_id, int):
                errors.append(f"'to_record_id' in '{key}' must be an integer.")
                continue
            to_record = session.get(Record, to_record_id)
            if not to_record:
                errors.append(f"Linked record with ID '{to_record_id}' does not exist.")
                continue
            # Verify that to_record belongs to the 'to_table' of the link table
            if to_record.table_id != link_table.to_table_id:
                errors.append(
                    f"Linked record ID '{to_record_id}' does not belong to the 'to_table' of link table '{link_table.name}'."
                )
            # Validate additional fields based on link table's columns
            for link_col in link_table.columns:
                field_name = link_col.name
                if link_col.required and field_name not in link_item:
                    errors.append(
                        f"Missing required field '{field_name}' in link data for '{key}'."
                    )
                if field_name in link_item:
                    field_value = link_item[field_name]
                    expected_type = link_col.data_type.lower()
                    if expected_type == "integer":
                        if not isinstance(field_value, int):
                            errors.append(
                                f"Field '{field_name}' in link data for '{key}' must be an integer."
                            )
                    elif expected_type in ["float", "currency"]:
                        if not isinstance(field_value, (int, float)):
                            errors.append(
                                f"Field '{field_name}' in link data for '{key}' must be a number."
                            )
                    elif expected_type == "string":
                        if not isinstance(field_value, str):
                            errors.append(
                                f"Field '{field_name}' in link data for '{key}' must be a string."
                            )
                    elif expected_type == "boolean":
                        if not isinstance(field_value, bool):
                            errors.append(
                                f"Field '{field_name}' in link data for '{key}' must be a boolean."
                            )
                    elif expected_type == "date":
                        if not isinstance(field_value, str):
                            errors.append(
                                f"Field '{field_name}' in link data for '{key}' must be a date string in ISO format."
                            )
                            continue
                        try:
                            parse_date(field_value).date()
                        except ValueError:
                            errors.append(
                                f"Field '{field_name}' in link data for '{key}' has invalid date format: '{field_value}'."
                            )
                    elif expected_type == "datetime":
                        if not isinstance(field_value, str):
                            errors.append(
                                f"Field '{field_name}' in link data for '{key}' must be a datetime string in ISO format."
                            )
                            continue
                        try:
                            parse_date(field_value)
                        except ValueError:
                            errors.append(
                                f"Field '{field_name}' in link data for '{key}' has invalid datetime format: '{field_value}'."
                            )
                    elif expected_type in ["enum", "picklist"]:
                        if not isinstance(field_value, str):
                            errors.append(
                                f"Field '{field_name}' in link data for '{key}' must be a string."
                            )
                            continue
                        if link_col.enum_id:
                            enum = session.get(EnumModel, link_col.enum_id)
                            if not enum:
                                errors.append(
                                    f"Enum for column '{field_name}' in link table '{link_table.name}' not found."
                                )
                                continue
                            allowed_values = {v.value for v in enum.values}
                            if field_value not in allowed_values:
                                errors.append(
                                    f"Field '{field_name}' in link data for '{key}' has invalid enum value: '{field_value}'. Allowed values: {allowed_values}"
                                )

    if errors:
        raise HTTPException(status_code=400, detail=errors)


def process_link_data(
    table: Table,
    record: Record,
    link_data: Dict[str, Any],
    session: Session,
):
    """
    Processes the link data to create, update, or delete LinkRecord entries with additional attributes.
    Supports both singular and list reference fields.
    """
    for key, value in link_data.items():
        column_name = key
        column = next((col for col in table.columns if col.name == column_name), None)
        if not column:
            continue  # Already handled in validation
        if not column.reference_link_table_id:
            continue  # Already handled in validation
        link_table = session.get(LinkTable, column.reference_link_table_id)
        if not link_table:
            continue  # Already handled in validation

        # Normalize to list of dicts
        if isinstance(value, dict):
            link_data_list = [value]
        elif isinstance(value, list):
            link_data_list = value
        else:
            continue  # Already handled in validation

        # Determine if the field is a list
        is_list = column.is_list

        # Extract to_record_ids and additional data from link_data_list
        new_links = []
        for idx, link_item in enumerate(link_data_list):
            to_record_id = link_item.get("to_record_id")
            additional_data = {
                k: v for k, v in link_item.items() if k != "to_record_id"
            }
            new_links.append((to_record_id, additional_data))

        # Fetch existing link records for this link table and from_record
        existing_links = session.exec(
            select(LinkRecord).where(
                LinkRecord.link_table_id == link_table.id,
                LinkRecord.from_record_id == record.id,
            )
        ).all()
        existing_to_ids = {lr.to_record_id for lr in existing_links}

        new_to_ids = {to_id for to_id, _ in new_links}

        # Determine records to add and remove
        to_add = new_to_ids - existing_to_ids
        to_remove = existing_to_ids - new_to_ids

        # Add new link records
        for to_id, additional_data in new_links:
            if to_id in to_add:
                new_link = LinkRecord(
                    link_table_id=link_table.id,
                    from_record_id=record.id,
                    to_record_id=to_id,
                    data=additional_data,  # Populate with additional fields
                )
                session.add(new_link)

        # Update existing link records if additional data has changed
        for lr in existing_links:
            if lr.to_record_id not in to_remove:
                # Find corresponding new link data
                corresponding_links = [
                    ld for ld in new_links if ld[0] == lr.to_record_id
                ]
                if corresponding_links:
                    _, new_additional_data = corresponding_links[0]
                    if lr.data != new_additional_data:
                        lr.data = new_additional_data
                        session.add(lr)

        # Remove obsolete link records
        for lr in existing_links:
            if lr.to_record_id in to_remove:
                session.delete(lr)

    # Commit link record changes
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        log.error(f"Failed to process link data for record {record.id}: {e}")
        raise HTTPException(
            status_code=400, detail="Failed to process link data"
        ) from e


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

    # Extract link data and remove from main data
    link_data = {}
    data = record.data.copy()
    for key in list(data.keys()):
        if key.endswith("_link_data"):
            link_data[key[:-10]] = data.pop(key)

    # Validate incoming data
    validate_record_data(table, data, link_data, session)

    db_record = Record(table_id=table.id, data=data)
    session.add(db_record)
    try:
        session.commit()
        session.refresh(db_record)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Record creation failed") from e

    # Process link data
    process_link_data(table, db_record, link_data, session)

    # Index in Elasticsearch
    background_tasks.add_task(index_record, table.name, db_record.id, data)

    # Broadcast data update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "data_update",
                "action": "create",
                "table": table.name,
                "id": db_record.id,
            }
        ),
    )
    # Include display values
    record_read = RecordRead.model_validate(db_record, from_attributes=True)
    record_read.display_value = ""
    record_read.display_value_secondary = ""
    return record_read


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
    results = []
    for record in records:
        record_read = RecordRead.model_validate(record, from_attributes=True)
        # Fetch display values from Elasticsearch
        index_name = get_index_name(table.name)
        try:
            es_resp = es.get(index=index_name, id=record.id)
            source = es_resp.get("_source", {})
            record_read.display_value = source.get("display_value", "")
            record_read.display_value_secondary = source.get(
                "display_value_secondary", ""
            )
        except es_exceptions.NotFoundError:
            record_read.display_value = ""
            record_read.display_value_secondary = ""
        results.append(record_read)
    return results


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

    # Extract link data and remove from main data
    link_data = {}
    data = record.data.copy()
    for key in list(data.keys()):
        if key.endswith("_link_data"):
            link_data[key[:-10]] = data.pop(key)

    # Validate incoming data
    validate_record_data(table, data, link_data, session)

    # Update fields
    db_record.data = data
    db_record.updated_at = datetime.now(timezone.utc)
    session.add(db_record)
    try:
        session.commit()
        session.refresh(db_record)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Record update failed") from e

    # Process link data
    process_link_data(table, db_record, link_data, session)

    # Re-index in Elasticsearch
    background_tasks.add_task(index_record, table.name, db_record.id, data)

    # Broadcast data update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "data_update",
                "action": "update",
                "table": table.name,
                "id": db_record.id,
            }
        ),
    )
    # Include display values
    record_read = RecordRead.model_validate(db_record, from_attributes=True)
    record_read.display_value = ""
    record_read.display_value_secondary = ""
    return record_read


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

    # Delete associated LinkRecords where this record is involved
    link_records = session.exec(
        select(LinkRecord).where(
            (LinkRecord.from_record_id == record_id)
            | (LinkRecord.to_record_id == record_id)
        )
    ).all()
    for lr in link_records:
        session.delete(lr)

    session.delete(db_record)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Record deletion failed") from e

    # Remove from Elasticsearch if indexed
    background_tasks.add_task(remove_record_from_index, table.name, record_id)

    # Broadcast data update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "data_update",
                "action": "delete",
                "table": table.name,
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
    # Use lowercase field names to match Elasticsearch indexing
    searchable_fields = [f"data.{col.name.lower()}" for col in columns]
    # Add display_value and display_value_secondary to searchable fields
    searchable_fields.extend(["display_value", "display_value_secondary"])

    if not searchable_fields:
        raise HTTPException(
            status_code=400, detail="No searchable fields defined for this table"
        )

    # Perform search in Elasticsearch
    index_name = get_index_name(table.name)
    try:
        es_resp = es.search(
            index=index_name,
            body={
                "query": {
                    "multi_match": {
                        "query": query,
                        "fields": searchable_fields,
                        "fuzziness": "AUTO",
                        "operator": "and",
                        "type": "best_fields",
                    }
                }
            },
        )
    except es_exceptions.NotFoundError as e:
        log.error(f"Elasticsearch index not found: {e}", exc_info=True)
        return []
    except Exception as e:
        log.error(f"Search operation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Search operation failed") from e

    hits = es_resp["hits"]["hits"]
    record_ids = [int(hit["_id"]) for hit in hits]

    # Fetch records from DB
    if not record_ids:
        return []

    records = session.exec(
        select(Record).where(Record.id.in_(record_ids), Record.table_id == table.id)
    ).all()

    # Map record IDs to records
    record_map = {record.id: record for record in records}

    # Build the response including display values from Elasticsearch
    results = []
    for hit in hits:
        record_id = int(hit["_id"])
        record = record_map.get(record_id)
        if record:
            record_read = RecordRead.model_validate(record, from_attributes=True)
            source = hit.get("_source", {})
            record_read.display_value = source.get("display_value", "")
            record_read.display_value_secondary = source.get(
                "display_value_secondary", ""
            )
            results.append(record_read)

    return results
