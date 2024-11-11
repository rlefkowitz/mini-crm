import logging
from typing import Any

from app.databases.database import es
from app.models.record import Record

log = logging.getLogger(__name__)


def get_index_name(table_name: str) -> str:
    return f"records_{table_name.lower()}"


def index_record(record: Record, searchable_data: dict[str, Any]):
    index_name = get_index_name(record.table.name)
    try:
        es.index(
            index=index_name,
            id=record.id,
            body={
                "table_id": record.table_id,
                "data": searchable_data,
                "created_at": record.created_at.isoformat(),
                "updated_at": record.updated_at.isoformat(),
            },
        )
        log.info(f"Indexed record {record.id} in Elasticsearch index '{index_name}'")
    except Exception as e:
        log.error(f"Failed to index record {record.id}: {e}")


def remove_record_from_index(record: Record):
    index_name = get_index_name(record.table.name)
    try:
        es.delete(index=index_name, id=record.id)
        log.info(f"Removed record {record.id} from Elasticsearch index '{index_name}'")
    except Exception as e:
        log.error(f"Failed to remove record {record.id}: {e}")


def index_existing_records(table_id: int, column_name: str):
    from sqlmodel import Session, select

    from app.databases.database import get_engine
    from app.models.record import Record
    from app.models.schema import Column, Table

    engine = get_engine()
    with Session(engine) as session:
        table = session.get(Table, table_id)
        if not table:
            log.error(f"Table with id {table_id} not found for indexing.")
            return
        column = session.exec(
            select(Column).where(
                Column.table_id == table_id, Column.name == column_name
            )
        ).first()
        if not column:
            log.error(
                f"Column '{column_name}' not found in table '{table.name}' for indexing."
            )
            return

        records = session.exec(select(Record).where(Record.table_id == table.id)).all()
        searchable_data_key = column.name
        for record in records:
            searchable_data = {
                searchable_data_key: record.data.get(searchable_data_key)
            }
            if searchable_data.get(searchable_data_key):
                index_record(record, searchable_data)
