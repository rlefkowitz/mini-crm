import logging
from typing import Any

from sqlmodel import Session, select

from app.databases.database import es, get_engine
from app.models.record import Record
from app.models.schema import Table

log = logging.getLogger(__name__)


def get_index_name(table_name: str) -> str:
    return f"records_{table_name.lower()}"


def create_index_with_mappings(index_name: str):
    """
    Creates an Elasticsearch index with predefined mappings if it doesn't exist.
    """
    if not es.indices.exists(index=index_name):
        mappings = {
            "mappings": {
                "properties": {
                    "table_id": {"type": "integer"},
                    "data": {
                        "properties": {
                            "name": {
                                "type": "text",
                                "analyzer": "standard",
                                "fields": {"keyword": {"type": "keyword"}},
                            },
                            # Add other searchable fields here with appropriate mappings
                        }
                    },
                    "created_at": {"type": "date"},
                    "updated_at": {"type": "date"},
                }
            }
        }
        try:
            es.indices.create(index=index_name, body=mappings)
            log.info(f"Created Elasticsearch index '{index_name}' with mappings.")
        except Exception as e:
            log.error(f"Failed to create index '{index_name}': {e}")


def index_record(table_name: str, record_id: int, searchable_data: dict[str, Any]):
    index_name = get_index_name(table_name)
    engine = get_engine()

    # Ensure the index exists with correct mappings
    create_index_with_mappings(index_name)

    with Session(engine) as session:
        record = session.get(Record, record_id)
        if not record:
            log.error(f"Record with id {record_id} not found for indexing.")
            return

        # Transform keys to lowercase for consistency
        searchable_data_lower = {k.lower(): v for k, v in searchable_data.items()}

        try:
            es.index(
                index=index_name,
                id=record_id,
                body={
                    "table_id": record.table_id,
                    "data": searchable_data_lower,
                    "created_at": record.created_at.isoformat(),
                    "updated_at": record.updated_at.isoformat(),
                },
            )
            log.info(
                f"Indexed record {record_id} in Elasticsearch index '{index_name}'."
            )
        except Exception as e:
            log.error(f"Failed to index record {record_id}: {e}")


def remove_record_from_index(table_name: str, record_id: int):
    index_name = get_index_name(table_name)
    try:
        es.delete(index=index_name, id=record_id)
        log.info(f"Removed record {record_id} from Elasticsearch index '{index_name}'.")
    except Exception as e:
        log.error(f"Failed to remove record {record_id}: {e}")


def index_existing_records(table_id: int, column_name: str):
    log.info(
        f"Starting index_existing_records for table_id={table_id}, column_name='{column_name}'."
    )
    engine = get_engine()
    with Session(engine) as session:
        table = session.get(Table, table_id)
        if not table:
            log.error(f"Table with id {table_id} not found for indexing.")
            return
        column = next((col for col in table.columns if col.name == column_name), None)
        if not column:
            log.error(
                f"Column '{column_name}' not found in table '{table.name}' for indexing."
            )
            return

        records = session.exec(select(Record).where(Record.table_id == table.id)).all()
        log.info(f"Found {len(records)} records to index.")
        searchable_data_key = column.name.lower()  # Ensure lowercase key
        for record in records:
            value = record.data.get(column.name)
            if value:
                searchable_data = {searchable_data_key: value}
                try:
                    index_record(table.name, record.id, searchable_data)
                except Exception as e:
                    log.error(f"Error indexing record {record.id}: {e}")
            else:
                log.info(
                    f"Record {record.id} has no data for '{searchable_data_key}', skipping indexing."
                )
