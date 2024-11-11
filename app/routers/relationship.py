import json

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, select

from app.databases.database import get_session
from app.models.relationship import RelationshipAttribute, RelationshipModel
from app.models.schema import Column, Table
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.relationship import (
    RelationshipAttributeRead,
    RelationshipCreate,
    RelationshipRead,
)
from app.websocket import manager

router = APIRouter()


def get_table_by_name(name: str, session: Session) -> Table:
    table = session.exec(select(Table).where(Table.name == name)).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    return table


def fetch_tables_from_create(relationship: RelationshipCreate, session: Session):
    from_table = get_table_by_name(relationship.from_table, session)
    to_table = get_table_by_name(relationship.to_table, session)
    if not from_table or not to_table:
        raise HTTPException(status_code=404, detail="One or both tables not found")
    return from_table, to_table


@router.post("/relationships/", response_model=RelationshipRead)
def create_relationship(
    relationship: RelationshipCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # Check if relationship with the same name exists
    existing_relationship = session.exec(
        select(RelationshipModel).where(RelationshipModel.name == relationship.name)
    ).first()
    if existing_relationship:
        raise HTTPException(
            status_code=400, detail="Relationship with this name already exists"
        )

    # Verify that from_table and to_table exist
    from_table, to_table = fetch_tables_from_create(relationship, session)
    if not from_table or not to_table:
        raise HTTPException(status_code=404, detail="One or both tables not found")

    # Create RelationshipModel
    db_relationship = RelationshipModel(
        name=relationship.name,
        from_table_id=from_table.id,
        to_table_id=to_table.id,
        relationship_type=relationship.relationship_type,
    )
    session.add(db_relationship)
    try:
        session.commit()
        session.refresh(db_relationship)
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Relationship creation failed"
        ) from e

    # Create RelationshipAttributeModels
    for attr in relationship.attributes:
        db_attribute = RelationshipAttribute(
            relationship_id=db_relationship.id,
            name=attr.name,
            data_type=attr.data_type,
            constraints=attr.constraints,
        )
        session.add(db_attribute)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Relationship attributes creation failed"
        ) from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "create_relationship",
                "relationship": {
                    "id": db_relationship.id,
                    "name": db_relationship.name,
                    "from_table": db_relationship.from_table.name,
                    "to_table": db_relationship.to_table.name,
                    "relationship_type": db_relationship.relationship_type,
                    "attributes": [
                        {
                            "id": attr.id,
                            "name": attr.name,
                            "data_type": attr.data_type,
                            "constraints": attr.constraints,
                        }
                        for attr in db_relationship.attributes
                    ],
                },
            }
        ),
    )

    # Mark related table columns as searchable if needed
    # For this example, let's assume you want to mark the 'name' column as searchable
    # Adjust this logic based on your specific requirements

    # Mark related table columns as searchable
    to_table = get_table_by_name(relationship.to_table_id, session)
    if to_table:
        # For example, mark the 'name' column as searchable
        name_column = session.exec(
            select(Column).where(Column.table_id == to_table.id, Column.name == "name")
        ).first()
        if name_column and not name_column.searchable:
            name_column.searchable = True
            session.add(name_column)
            try:
                session.commit()
                session.refresh(name_column)
                # Broadcast schema update for the searchable column
                background_tasks.add_task(
                    manager.broadcast,
                    json.dumps(
                        {
                            "type": "schema_update",
                            "action": "update_column",
                            "table": to_table.name,
                            "column": name_column.name,
                            "searchable": name_column.searchable,
                        }
                    ),
                )
            except Exception as e:
                session.rollback()
                raise HTTPException(
                    status_code=400, detail="Failed to update searchable column"
                ) from e

    return RelationshipRead(
        id=db_relationship.id,
        name=db_relationship.name,
        from_table=db_relationship.from_table.name,
        to_table=db_relationship.to_table.name,
        relationship_type=db_relationship.relationship_type,
        attributes=[
            RelationshipAttributeRead.model_validate(attr)
            for attr in db_relationship.attributes
        ],
    )


@router.get("/relationships/", response_model=list[RelationshipRead])
def read_relationships(
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    relationships = session.exec(select(RelationshipModel)).all()
    return [
        RelationshipRead(
            id=rel.id,
            name=rel.name,
            from_table=rel.from_table.name,
            to_table=rel.to_table.name,
            relationship_type=rel.relationship_type,
            attributes=[
                RelationshipAttributeRead.model_validate(attr)
                for attr in rel.attributes
            ],
        )
        for rel in relationships
    ]


@router.get("/relationships/{relationship_id}", response_model=RelationshipRead)
def read_relationship(
    relationship_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    relationship = session.get(RelationshipModel, relationship_id)
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")
    return RelationshipRead(
        id=relationship.id,
        name=relationship.name,
        from_table=relationship.from_table.name,
        to_table=relationship.to_table.name,
        relationship_type=relationship.relationship_type,
        attributes=[
            RelationshipAttributeRead.model_validate(attr)
            for attr in relationship.attributes
        ],
    )


@router.put("/relationships/{relationship_id}/", response_model=RelationshipRead)
def update_relationship(
    relationship_id: int,
    relationship: RelationshipCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    db_relationship = session.get(RelationshipModel, relationship_id)
    if not db_relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")

    # Update basic fields
    from_table, to_table = fetch_tables_from_create(relationship, session)
    db_relationship.name = relationship.name
    db_relationship.from_table_id = from_table.id
    db_relationship.to_table_id = to_table.id
    db_relationship.relationship_type = relationship.relationship_type

    session.add(db_relationship)
    try:
        session.commit()
        session.refresh(db_relationship)
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Relationship update failed") from e

    # Update attributes
    existing_attributes = {attr.name: attr for attr in db_relationship.attributes}
    new_attributes = {attr.name: attr for attr in relationship.attributes}

    # Add new attributes
    for attr_name, attr in new_attributes.items():
        if attr_name not in existing_attributes:
            db_attribute = RelationshipAttribute(
                relationship_id=db_relationship.id,
                name=attr.name,
                data_type=attr.data_type,
                constraints=attr.constraints,
            )
            session.add(db_attribute)

    # Update existing attributes
    for attr_name, attr in new_attributes.items():
        if attr_name in existing_attributes:
            db_attribute = existing_attributes[attr_name]
            db_attribute.data_type = attr.data_type
            db_attribute.constraints = attr.constraints
            session.add(db_attribute)

    # Remove deleted attributes
    for attr_name in existing_attributes.keys():
        if attr_name not in new_attributes:
            session.delete(existing_attributes[attr_name])

    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Relationship attributes update failed"
        ) from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "update_relationship",
                "relationship": {
                    "id": db_relationship.id,
                    "name": db_relationship.name,
                    "from_table": db_relationship.from_table.name,
                    "to_table": db_relationship.to_table.name,
                    "relationship_type": db_relationship.relationship_type,
                    "attributes": [
                        {
                            "id": attr.id,
                            "name": attr.name,
                            "data_type": attr.data_type,
                            "constraints": attr.constraints,
                        }
                        for attr in db_relationship.attributes
                    ],
                },
            }
        ),
    )

    return RelationshipRead(
        id=db_relationship.id,
        name=db_relationship.name,
        from_table=db_relationship.from_table.name,
        to_table=db_relationship.to_table.name,
        relationship_type=db_relationship.relationship_type,
        attributes=[
            RelationshipAttributeRead.model_validate(attr)
            for attr in db_relationship.attributes
        ],
    )


@router.delete("/relationships/{relationship_id}")
def delete_relationship(
    relationship_id: int,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    db_relationship = session.get(RelationshipModel, relationship_id)
    if not db_relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")

    relationship_name = db_relationship.name
    session.delete(db_relationship)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Relationship deletion failed"
        ) from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "delete_relationship",
                "relationship": relationship_name,
            }
        ),
    )

    return {"ok": True}
