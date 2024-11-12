import asyncio
import logging
import os
from contextlib import asynccontextmanager

import pyfiglet
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from passlib import pwd
from starlette.middleware.sessions import SessionMiddleware

from utilities import envs

# Ensure .env is loaded before we import env var dependent stuff
load_dotenv()

import app.models
from app.databases import database
from app.routes import router
from app.websocket import router as websocket_router

log = logging.getLogger(__name__)

AUTH_SECRET = pwd.genword()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    log.info("\n" + pyfiglet.figlet_format("Mini CRM API") + "\n")
    yield

    handle_pending_tasks()
    handle_disconnect_db()


def init_loggers():
    """
    Initialize logger levels
    Sets root logging level to env.LOGGING_LEVEL or INFO
    """
    log_level = logging._nameToLevel.get(
        os.environ.get("LOGGING_LEVEL", "INFO").upper()
    )
    logging.getLogger().setLevel(log_level)

    uvicorn_logger = logging.getLogger("uvicorn.error")
    uvicorn_logger.setLevel(logging.WARNING)


def init_db():
    if envs.get_env() in envs.SQLITE_ENVS:
        log.info("Skipping DB initialization: running in SQLite env\n")
        return

    log.info("Initializing DB...")

    # Retry every 5s, 5 times
    database.establish_connection()
    database.migrate()

    log.info("DB initialization complete\n")


def init_debugger():
    import debugpy

    debugpy.listen(("0.0.0.0", 5678))  # Use a port different from your app, e.g., 5678
    log.info("Waiting for debugger attach")
    debugpy.wait_for_client()  # Blocks execution until client is attached


def handle_pending_tasks():
    loop = asyncio.get_event_loop()
    pending = asyncio.all_tasks(loop)

    if not pending:
        return

    for t in pending:
        log.info(f"  {t}")
        # TODO: if any tasks are unexpected, log.warning or do something about it


def handle_disconnect_db():
    """
    Handles closing the database connection
    """
    log.info("Disconnecting from DB...")
    database.ensure_disconnect()
    log.info("DB disconnect complete\n")


try:
    init_loggers()

    # API Docs are unprotected only when running locally
    if envs.get_env() in envs.HOSTED_ENVS:
        app = FastAPI(
            lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None
        )
    else:
        log.info("Starting app in local mode\n")
        app = FastAPI(lifespan=lifespan)

    app.include_router(router)
    app.include_router(websocket_router)

    if envs.get_env() in envs.HOSTED_ENVS:
        app.mount(
            "/",
            StaticFiles(directory="static", html=True),
            name="Mini CRM",
        )

    app.add_middleware(SessionMiddleware, secret_key=AUTH_SECRET)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    if envs.get_env() == envs.DEV and os.environ.get("ENABLE_DEBUGGER") == "true":
        init_debugger()

except Exception as e:
    logging.critical(f"Error loading app: {e}", exc_info=True)
