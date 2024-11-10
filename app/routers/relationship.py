import asyncio
import json

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
from app.utils.migration import (
    add_relationship_attribute,
    create_relationship_table,
    drop_relationship_attribute,
    drop_relationship_table,
    map_data_type,
)
from app.websocket import manager

router = APIRouter()


@router.post("/relationships/", response_model=RelationshipRead)
def create_relationship(
    relationship: RelationshipCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    # Fetch from_table and to_table
    from_table = session.exec(
        select(Table).where(Table.name == relationship.from_table)
    ).first()
    to_table = session.exec(
        select(Table).where(Table.name == relationship.to_table)
    ).first()

    if not from_table or not to_table:
        raise HTTPException(status_code=404, detail="One or both tables not found")

    # Create RelationshipModel instance
    db_relationship = RelationshipModel(
        name=relationship.name,
        from_table_id=from_table.id,
        to_table_id=to_table.id,
        attributes=json.dumps([]),  # Initialize with empty list
    )
    session.add(db_relationship)
    try:
        session.commit()
        session.refresh(db_relationship)
        # Apply migration to create the junction table
        create_relationship_table(db_relationship, session)

        # Handle additional attributes
        if relationship.attributes:
            for attr in relationship.attributes:
                db_attribute = RelationshipAttribute(
                    relationship_id=db_relationship.id,
                    name=attr.name,
                    data_type=attr.data_type,
                    constraints=attr.constraints,
                )
                session.add(db_attribute)
                add_relationship_attribute(
                    db_relationship, db_attribute
                )  # Apply migration
            session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(
            status_code=400, detail="Relationship creation failed"
        ) from e

    # Broadcast schema update
    background_tasks.add_task(
        manager.broadcast,
        json.dumps(
            {
                "type": "schema_update",
                "action": "create_relationship",
                "relationship": relationship.name,
            }
        ),
    )

    # Prepare response
    attributes = session.exec(
        select(RelationshipAttribute).where(
            RelationshipAttribute.relationship_id == db_relationship.id
        )
    ).all()
    return RelationshipRead(
        id=db_relationship.id,
        name=db_relationship.name,
        from_table=from_table.name,
        to_table=to_table.name,
        attributes=[
            RelationshipAttributeRead.model_validate(attr) for attr in attributes
        ],
    )


@router.get("/relationships/", response_model=list[RelationshipRead])
def read_relationships(
    session: Session = Depends(get_session), user: User = Depends(get_current_user)
):
    relationships = session.exec(select(RelationshipModel)).all()
    response = []
    for rel in relationships:
        from_table = session.get(Table, rel.from_table_id)
        to_table = session.get(Table, rel.to_table_id)
        attributes = session.exec(
            select(RelationshipAttribute).where(
                RelationshipAttribute.relationship_id == rel.id
            )
        ).all()
        response.append(
            RelationshipRead(
                id=rel.id,
                name=rel.name,
                from_table=from_table.name if from_table else "",
                to_table=to_table.name if to_table else "",
                attributes=[
                    RelationshipAttributeRead.model_validate(attr)
                    for attr in attributes
                ],
            )
        )
    return response


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
    relationship_name = relationship.name
    try:
        # Apply migration to drop the junction table
        drop_relationship_table(relationship, session)
        session.delete(relationship)
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
