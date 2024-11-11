from fastapi import APIRouter

from . import auth, enum, records, relationship, schema, user

router = APIRouter()

# Include routers
router.include_router(auth.router, prefix="/api", tags=["auth"])
router.include_router(schema.router, prefix="/api", tags=["schema"])
router.include_router(relationship.router, prefix="/api", tags=["relationships"])
router.include_router(user.router, prefix="/api", tags=["users"])
router.include_router(records.router, prefix="/api", tags=["records"])
router.include_router(enum.router, prefix="/api", tags=["enums"])
