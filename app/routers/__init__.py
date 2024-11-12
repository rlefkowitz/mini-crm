from fastapi import APIRouter

from . import auth, enum, link, records, schema, user

router = APIRouter()

# Include routers
router.include_router(auth.router, prefix="/api", tags=["auth"])
router.include_router(schema.router, prefix="/api", tags=["schema"])
router.include_router(link.router, prefix="/api", tags=["links"])
router.include_router(user.router, prefix="/api", tags=["users"])
router.include_router(records.router, prefix="/api", tags=["records"])
router.include_router(enum.router, prefix="/api", tags=["enums"])
