from sqlalchemy import text
from sqlmodel import Session

from app.databases.database import engine
from app.models.relationship import RelationshipAttribute, RelationshipModel
from app.models.schema import Table


def create_table(table_name: str):
    with engine.connect() as conn:
        create_stmt = f"""
        CREATE TABLE IF NOT EXISTS "{table_name}" (
            id SERIAL PRIMARY KEY
        );
        """
        conn.execute(text(create_stmt))
        conn.commit()


def drop_table(table_name: str):
    with engine.connect() as conn:
        drop_stmt = f'DROP TABLE IF EXISTS "{table_name}" CASCADE;'
        conn.execute(text(drop_stmt))
        conn.commit()


def add_column(
    table_name: str, column_name: str, data_type: str, constraints: str | None = None
):
    type_mapping = {
        "string": "VARCHAR",
        "integer": "INTEGER",
        "currency": "DECIMAL(10,2)",
        "enum": "VARCHAR",
        "picklist": "VARCHAR",
    }
    pg_type = type_mapping.get(data_type.lower(), "VARCHAR")
    constraint_str = ""
    if constraints:
        constraint_str = constraints  # Expected to be a valid SQL constraint string, e.g., "NOT NULL"
    with engine.connect() as conn:
        alter_stmt = f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {pg_type} {constraint_str};'
        conn.execute(text(alter_stmt))
        conn.commit()


def drop_column(table_name: str, column_name: str):
    with engine.connect() as conn:
        alter_stmt = (
            f'ALTER TABLE "{table_name}" DROP COLUMN IF EXISTS "{column_name}" CASCADE;'
        )
        conn.execute(text(alter_stmt))
        conn.commit()


def create_relationship_table(relationship: RelationshipModel, session: Session):
    table_name = relationship.name.lower()
    from_table = session.get(Table, relationship.from_table_id).name.lower()
    to_table = session.get(Table, relationship.to_table_id).name.lower()
    # Create a junction table with foreign keys and an 'id' primary key
    create_stmt = f"""
    CREATE TABLE IF NOT EXISTS "{table_name}" (
        id SERIAL PRIMARY KEY,
        "{from_table}_id" INTEGER NOT NULL REFERENCES "{from_table}"(id) ON DELETE CASCADE,
        "{to_table}_id" INTEGER NOT NULL REFERENCES "{to_table}"(id) ON DELETE CASCADE
    );
    """
    with engine.connect() as conn:
        conn.execute(text(create_stmt))
        conn.commit()


def drop_relationship_table(relationship: RelationshipModel, session: Session):
    table_name = relationship.name.lower()
    drop_stmt = f'DROP TABLE IF EXISTS "{table_name}" CASCADE;'
    with engine.connect() as conn:
        conn.execute(text(drop_stmt))
        conn.commit()


def add_relationship_attribute(
    relationship: RelationshipModel, attribute: RelationshipAttribute
):
    table_name = relationship.name.lower()
    column_name = attribute.name.lower()
    data_type = map_data_type(attribute.data_type)
    constraints = attribute.constraints or ""
    with engine.connect() as conn:
        alter_stmt = f'ALTER TABLE "{table_name}" ADD COLUMN "{column_name}" {data_type} {constraints};'
        conn.execute(text(alter_stmt))
        conn.commit()


def drop_relationship_attribute(
    relationship: RelationshipModel, attribute: RelationshipAttribute
):
    table_name = relationship.name.lower()
    column_name = attribute.name.lower()
    with engine.connect() as conn:
        alter_stmt = (
            f'ALTER TABLE "{table_name}" DROP COLUMN IF EXISTS "{column_name}" CASCADE;'
        )
        conn.execute(text(alter_stmt))
        conn.commit()


def map_data_type(data_type: str) -> str:
    mapping = {
        "string": "VARCHAR",
        "integer": "INTEGER",
        "currency": "DECIMAL(10,2)",
        "enum": "VARCHAR",
        "picklist": "VARCHAR",
        # Add more mappings as needed
    }
    return mapping.get(data_type.lower(), "VARCHAR")
