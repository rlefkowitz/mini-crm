import logging
import string
from typing import Any

from elasticsearch import exceptions as es_exceptions
from sqlmodel import Session, select

from app.databases.database import es, get_engine
from app.models.link import LinkRecord
from app.models.record import Record
from app.models.schema import Table

log = logging.getLogger(__name__)


def get_index_name(table_name: str) -> str:
    return f"records_{table_name.lower()}"


class CustomFormatter(string.Formatter):
    def __init__(self, session):
        self.session = session

    def get_value(self, key, args, kwargs):
        if isinstance(key, str):
            parts = key.split(".")
            obj = kwargs
            for part in parts:
                if isinstance(obj, dict):
                    obj = obj.get(part, "")
                else:
                    obj = getattr(obj, part, "")
                if obj == "":
                    break
            return obj
        else:
            return super().get_value(key, args, kwargs)


def generate_display_value(table: Table, record: Record, session: Session) -> str:
    data = record.data.copy()
    # Resolve references in data
    for col in table.columns:
        if col.data_type == "reference" and col.name in data:
            ref_value = data[col.name]
            if col.reference_table_id:
                if col.is_list:
                    ref_display_values = []
                    for ref_id in ref_value:
                        ref_record = session.get(Record, ref_id)
                        if ref_record:
                            ref_table = session.get(Table, ref_record.table_id)
                            ref_display_value = generate_display_value(
                                ref_table, ref_record, session
                            )
                            ref_display_values.append(ref_display_value)
                    data[col.name] = ", ".join(ref_display_values)
                else:
                    ref_record = session.get(Record, ref_value)
                    if ref_record:
                        ref_table = session.get(Table, ref_record.table_id)
                        ref_display_value = generate_display_value(
                            ref_table, ref_record, session
                        )
                        data[col.name] = ref_display_value
            elif col.reference_link_table_id:
                # Handle many-to-many relationships via LinkRecord
                # Fetch all linked records with additional data
                linked_records = session.exec(
                    select(LinkRecord).where(
                        LinkRecord.link_table_id == col.reference_link_table_id,
                        LinkRecord.from_record_id == record.id,
                    )
                ).all()
                linked_display_values = []
                for lr in linked_records:
                    linked_record = session.get(Record, lr.to_record_id)
                    if linked_record:
                        linked_table = session.get(Table, linked_record.table_id)
                        if linked_table:
                            linked_display = generate_display_value(
                                linked_table, linked_record, session
                            )
                            linked_display_values.append(linked_display)
                data[col.name] = (
                    ", ".join(linked_display_values) if linked_display_values else ""
                )

    # Generate display value using the display format
    if table.display_format:
        formatter = CustomFormatter(session)
        try:
            return formatter.format(table.display_format, **data)
        except KeyError as e:
            log.error(f"KeyError in display_format for table {table.name}: {e}")
            return f"{table.name} item"
    else:
        return ""


def generate_display_value_secondary(
    table: Table, record: Record, session: Session
) -> str:
    data = record.data.copy()
    # Resolve references in data
    for col in table.columns:
        if col.data_type == "reference" and col.name in data:
            ref_value = data[col.name]
            if col.reference_table_id:
                if col.is_list:
                    ref_display_values = []
                    for ref_id in ref_value:
                        ref_record = session.get(Record, ref_id)
                        if ref_record:
                            ref_table = session.get(Table, ref_record.table_id)
                            ref_display_value = generate_display_value_secondary(
                                ref_table, ref_record, session
                            )
                            ref_display_values.append(ref_display_value)
                    data[col.name] = ", ".join(ref_display_values)
                else:
                    ref_record = session.get(Record, ref_value)
                    if ref_record:
                        ref_table = session.get(Table, ref_record.table_id)
                        ref_display_value = generate_display_value_secondary(
                            ref_table, ref_record, session
                        )
                        data[col.name] = ref_display_value
            elif col.reference_link_table_id:
                # Handle many-to-many relationships via LinkRecord
                # Fetch all linked records with additional data
                linked_records = session.exec(
                    select(LinkRecord).where(
                        LinkRecord.link_table_id == col.reference_link_table_id,
                        LinkRecord.from_record_id == record.id,
                    )
                ).all()
                linked_display_values = []
                for lr in linked_records:
                    linked_record = session.get(Record, lr.to_record_id)
                    if linked_record:
                        linked_table = session.get(Table, linked_record.table_id)
                        if linked_table:
                            linked_display = generate_display_value_secondary(
                                linked_table, linked_record, session
                            )
                            linked_display_values.append(linked_display)
                data[col.name] = (
                    ", ".join(linked_display_values) if linked_display_values else ""
                )

    # Generate display value using the display format secondary
    if table.display_format_secondary:
        formatter = CustomFormatter(session)
        try:
            return formatter.format(table.display_format_secondary, **data)
        except KeyError as e:
            log.error(
                f"KeyError in display_format_secondary for table {table.name}: {e}"
            )
            return ""
    else:
        return ""


def create_index_with_mappings(index_name: str):
    """
    Creates an Elasticsearch index with predefined mappings if it doesn't exist.
    """
    if not es.indices.exists(index=index_name):
        mappings = {
            "mappings": {
                "properties": {
                    "table_id": {"type": "integer"},
                    "data": {"type": "object", "dynamic": True},
                    "display_value": {
                        "type": "text",
                        "analyzer": "standard",
                        "fields": {"keyword": {"type": "keyword"}},
                    },
                    "display_value_secondary": {
                        "type": "text",
                        "analyzer": "standard",
                        "fields": {"keyword": {"type": "keyword"}},
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


def index_record(table_name: str, record_id: int, data: dict[str, Any]):
    index_name = get_index_name(table_name)
    engine = get_engine()

    # Ensure the index exists with correct mappings
    create_index_with_mappings(index_name)

    with Session(engine) as session:
        record = session.get(Record, record_id)
        if not record:
            log.error(f"Record with id {record_id} not found for indexing.")
            return

        table = session.exec(select(Table).where(Table.id == record.table_id)).first()
        if not table:
            log.error(f"Table '{table_name}' not found.")
            return

        # Generate display values
        display_value = generate_display_value(table, record, session)
        display_value_secondary = generate_display_value_secondary(
            table, record, session
        )

        # Transform keys to lowercase for consistency
        searchable_data_lower = {}
        for k, v in data.items():
            if isinstance(v, list):
                # For lists, join items into a single string
                searchable_data_lower[k.lower()] = ", ".join(map(str, v))
            else:
                searchable_data_lower[k.lower()] = v

        try:
            es.index(
                index=index_name,
                id=record_id,
                body={
                    "table_id": record.table_id,
                    "data": searchable_data_lower,
                    "display_value": display_value,
                    "display_value_secondary": display_value_secondary,
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
    except es_exceptions.NotFoundError:
        log.warning(
            f"Record {record_id} not found in Elasticsearch index '{index_name}'."
        )
    except Exception as e:
        log.error(f"Failed to remove record {record_id}: {e}")


def index_existing_records(table_id: int):
    log.info(f"Starting index_existing_records for table_id={table_id}.")
    engine = get_engine()
    with Session(engine) as session:
        table = session.get(Table, table_id)
        if not table:
            log.error(f"Table with id {table_id} not found for indexing.")
            return
        records = session.exec(select(Record).where(Record.table_id == table.id)).all()
        log.info(f"Found {len(records)} records to index.")
        for record in records:
            # Fetch searchable data
            searchable_data_lower = {}

            for col in table.columns:
                if col.searchable and col.name in record.data:
                    value = record.data[col.name]
                    if col.is_list:
                        if isinstance(value, list):
                            searchable_data_lower[col.name.lower()] = ", ".join(
                                map(str, value)
                            )
                        else:
                            searchable_data_lower[col.name.lower()] = str(value)
                    else:
                        searchable_data_lower[col.name.lower()] = value

            # Generate display values
            display_value = generate_display_value(table, record, session)
            display_value_secondary = generate_display_value_secondary(
                table, record, session
            )

            try:
                es.index(
                    index=get_index_name(table.name),
                    id=record.id,
                    body={
                        "table_id": record.table_id,
                        "data": searchable_data_lower,
                        "display_value": display_value,
                        "display_value_secondary": display_value_secondary,
                        "created_at": record.created_at.isoformat(),
                        "updated_at": record.updated_at.isoformat(),
                    },
                )
                log.info(
                    f"Indexed record {record.id} in Elasticsearch index '{get_index_name(table.name)}'."
                )
            except Exception as e:
                log.error(f"Failed to index record {record.id}: {e}")
