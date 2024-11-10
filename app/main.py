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

from app.databases import database
from app.routes import router
from app.websocket import router as websocket_router

log = logging.getLogger(__name__)

AUTH_SECRET = pwd.genword()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # On app startup
    log.info(" ~~~ Initializing app ~~~ \n")

    init_db()

    # Handoff to the app
    log.info(" ~~~ App initializations complete, starting now! ~~~ \n")
    log.info("\n" + pyfiglet.figlet_format("Mini CRM API") + "\n")
    yield

    # On app shutdown
    log.info(" ~~~ App shutting down! Attempting to handle gracefully ~~~ \n")

    handle_pending_tasks()
    handle_disconnect_db()

    log.info(" ~~~ App shutdown complete ~~~ \n")


def init_loggers():
    """
    Initialize logger levels
    Sets root logging level to env.LOGGING_LEVEL or INFO
    Sets the uvicorn error logger to WARNING
    TODO: we can customize the logging format here
    """
    log_level = logging._nameToLevel.get(
        os.environ.get("LOGGING_LEVEL", "INFO").upper()
    )
    logging.getLogger().setLevel(log_level)

    # Info messages from uvicorn are duplicated in the console, so ignore them
    # also they're ugly (why is app startup an error?)
    uvicorn_logger = logging.getLogger("uvicorn.error")
    uvicorn_logger.setLevel(logging.WARNING)
    logging.getLogger("azure.eventhub._pyamqp").setLevel(logging.WARNING)

    logging.info(
        f"Initialized root logger with level {logging.getLevelName(logging.root.level)}"
    )


def init_db():
    """
    Initializes the database
    Establishes a connection to the database
    Runs schema migrations and startup scripts
    TODO: running migrations at startup may be problematic when we scale horizontally
    """

    if envs.get_env() in envs.SQLITE_ENVS:
        log.info("Skipping DB initialization: running in SQLite env\n")
        return

    log.info("Initializing DB...")

    # Retries connection every 5s for 5 attempts then gives up
    database.establish_connection()
    database.migrate()

    log.info("DB initialization complete\n")


def init_debugger():
    import debugpy

    debugpy.listen(("0.0.0.0", 5678))  # Use a port different from your app, e.g., 5678
    log.info("Waiting for debugger attach")
    debugpy.wait_for_client()  # Blocks execution until client is attached


def handle_pending_tasks():
    log.info("Handling pending tasks...")
    loop = asyncio.get_event_loop()
    pending = asyncio.all_tasks(loop)

    if not pending:
        log.info("No pending tasks\n")
        return

    log.info(f"Shutting down with {len(pending)} pending tasks:")
    for t in pending:
        log.info(f"  {t}")
        # TODO: if any tasks are unexpected, log.warning or do something about it

    log.info("Pending task handling complete (just printing these logs for now)\n")


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
        log.info("Starting app in hosted mode (docs protected)\n")
        app = FastAPI(
            lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None
        )
    else:
        log.info("Starting app in local mode\n")
        app = FastAPI(lifespan=lifespan)

    app.include_router(router)

    if envs.get_env() in envs.HOSTED_ENVS:
        app.mount(
            "/",
            StaticFiles(directory="static", html=True),
            name="Mini CRM",
        )

    app.include_router(websocket_router)

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
