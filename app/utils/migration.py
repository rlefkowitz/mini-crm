from sqlalchemy import text
from sqlmodel import Session

from app.databases.database import get_engine
from app.models.enum import EnumModel, EnumValueModel
from app.models.relationship import RelationshipAttribute, RelationshipModel
from app.models.schema import Column, Table

engine = get_engine()


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


def update_column(column: Column, session: Session):
    # Handle column updates, such as renaming, changing data type, adding/removing constraints
    # This is a simplified example that handles renaming and constraints
    # For full support, additional logic would be required
    table_name = column.table.name.lower()
    column_name = column.name.lower()

    # Reconstruct constraints
    constraints = []
    if column.required:
        constraints.append("NOT NULL")
    if column.unique:
        constraints.append("UNIQUE")
    if column.constraints:
        constraints.append(column.constraints)
    constraints_str = " ".join(constraints) if constraints else ""

    # Alter column data type if necessary
    type_mapping = {
        "string": "VARCHAR",
        "integer": "INTEGER",
        "currency": "DECIMAL(10,2)",
        "enum": "VARCHAR",
        "picklist": "VARCHAR",
    }
    pg_type = type_mapping.get(column.data_type.lower(), "VARCHAR")

    with engine.connect() as conn:
        # Alter data type
        alter_type_stmt = (
            f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" TYPE {pg_type};'
        )
        conn.execute(text(alter_type_stmt))

        # Set constraints
        if column.required:
            set_not_null = (
                f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" SET NOT NULL;'
            )
            conn.execute(text(set_not_null))
        else:
            drop_not_null = f'ALTER TABLE "{table_name}" ALTER COLUMN "{column_name}" DROP NOT NULL;'
            conn.execute(text(drop_not_null))

        if column.unique:
            add_unique = f'ALTER TABLE "{table_name}" ADD UNIQUE ("{column_name}");'
            conn.execute(text(add_unique))
        else:
            drop_unique = f'ALTER TABLE "{table_name}" DROP CONSTRAINT IF EXISTS "{table_name}_{column_name}_key";'
            conn.execute(text(drop_unique))

        # Additional constraints can be handled here

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
    }
    return mapping.get(data_type.lower(), "VARCHAR")


def add_enum(enum: EnumModel, session: Session):
    # Handle any necessary migrations for enums if required
    pass


def remove_enum(enum: EnumModel, session: Session):
    # Handle any necessary migrations for removing enums if required
    pass


def add_enum_value(enum: EnumModel, value: EnumValueModel):
    # Handle any necessary migrations for adding enum values if required
    pass


def remove_enum_value(enum: EnumModel, value: EnumValueModel, session: Session):
    # Handle any necessary migrations for removing enum values if required
    pass


def create_relationship_table(relationship: RelationshipModel, session: Session):
    table_name = relationship.name.lower()
    from_table = session.get(Table, relationship.from_table_id).name.lower()
    to_table = session.get(Table, relationship.to_table_id).name.lower()

    # Start building the create table statement
    create_stmt = f"""
    CREATE TABLE IF NOT EXISTS "{table_name}" (
        id SERIAL PRIMARY KEY,
        "{from_table}_id" INTEGER NOT NULL REFERENCES "{from_table}"(id) ON DELETE CASCADE,
        "{to_table}_id" INTEGER NOT NULL REFERENCES "{to_table}"(id) ON DELETE CASCADE
    )
    """

    # If the relationship is one-to-one, add unique constraint on one of the foreign keys
    if relationship.relationship_type == "one_to_one":
        # Let's add unique constraint on from_table_id
        create_stmt += f',\n    UNIQUE ("{from_table}_id")'
    elif relationship.relationship_type == "one_to_many":
        # In one-to-many, no unique constraints needed
        pass
    else:
        # Handle other relationship types if any
        pass

    # Add columns for relationship attributes
    for attr in relationship.attributes:
        pg_type = map_data_type(attr.data_type)
        constraint_str = attr.constraints or ""
        create_stmt += f',\n    "{attr.name}" {pg_type} {constraint_str}'

    create_stmt += ";"

    with engine.connect() as conn:
        conn.execute(text(create_stmt))
        conn.commit()


def drop_relationship_table(relationship: RelationshipModel, session: Session):
    table_name = relationship.name.lower()
    drop_stmt = f'DROP TABLE IF EXISTS "{table_name}" CASCADE;'
    with engine.connect() as conn:
        conn.execute(text(drop_stmt))
        conn.commit()


def map_data_type(data_type: str) -> str:
    mapping = {
        "string": "VARCHAR",
        "integer": "INTEGER",
        "currency": "DECIMAL(10,2)",
        "enum": "VARCHAR",  # Enums can be stored as VARCHAR or use PostgreSQL ENUM types
        "picklist": "VARCHAR",
    }
    return mapping.get(data_type.lower(), "VARCHAR")
