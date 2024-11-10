from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import records, relationship, schema, user
from app.websocket import router as websocket_router

app = FastAPI(title="Mini CRM API")

# Initialize the database
init_db()

# CORS settings
origins = [
    "http://localhost:3000",
    # Add other origins as needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(schema.router, prefix="/api", tags=["schema"])
app.include_router(relationship.router, prefix="/api", tags=["relationships"])
app.include_router(user.router, prefix="/api", tags=["users"])
app.include_router(records.router, prefix="/api", tags=["records"])
app.include_router(websocket_router)
