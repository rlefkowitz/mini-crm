from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlmodel import Session, select

from app.databases.database import get_session
from app.models.relationship import RelationshipAttribute, RelationshipModel
from app.models.schema import Table
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.relationship import (
    RelationshipAttributeRead,
    RelationshipCreate,
    RelationshipRead,
)
from app.utils.migration import create_relationship_table, drop_relationship_table
from app.websocket import manager

router = APIRouter()


@router.post("/relationships/", response_model=RelationshipRead)
def create_relationship(
    relationship: RelationshipCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # Check if relationship name already exists
    existing_relationship = session.exec(
        select(RelationshipModel).where(RelationshipModel.name == relationship.name)
    ).first()
    if existing_relationship:
        raise HTTPException(
            status_code=400, detail="Relationship with this name already exists"
        )

    # Fetch from_table and to_table
    from_table = session.exec(
        select(Table).where(Table.name == relationship.from_table)
    ).first()
    to_table = session.exec(
        select(Table).where(Table.name == relationship.to_table)
    ).first()

    if not from_table or not to_table:
        raise HTTPException(status_code=404, detail="From or To table not found")

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

        # Add attributes if any
        if relationship.attributes:
            for attr in relationship.attributes:
                db_attr = RelationshipAttribute(
                    relationship_id=db_relationship.id,
                    name=attr.name,
                    data_type=attr.data_type,
                    constraints=attr.constraints,
                )
                session.add(db_attr)
            session.commit()

        # Create the relationship table in the database
        create_relationship_table(db_relationship, session)
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Relationship creation failed"
        ) from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        {
            "type": "schema_update",
            "action": "create_relationship",
            "relationship": db_relationship.name,
            "from_table": from_table.name,
            "to_table": to_table.name,
            "relationship_type": db_relationship.relationship_type,
            "attributes": [
                {
                    "name": attr.name,
                    "data_type": attr.data_type,
                    "constraints": attr.constraints,
                }
                for attr in db_relationship.attributes
            ],
        },
    )

    return RelationshipRead(
        id=db_relationship.id,
        name=db_relationship.name,
        from_table=from_table.name,
        to_table=to_table.name,
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
    relationship = session.get(RelationshipModel, relationship_id)
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")

    try:
        # Drop the relationship table from the database
        drop_relationship_table(relationship, session)
        session.delete(relationship)
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Failed to delete relationship"
        ) from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        {
            "type": "schema_update",
            "action": "delete_relationship",
            "relationship": relationship.name,
        },
    )

    return {"ok": True}
