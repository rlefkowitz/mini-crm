import logging
from os import environ
from sys import stdout
from time import sleep

from alembic import command
from alembic.config import Config
from alembic.runtime import migration
from alembic.script import ScriptDirectory
from sqlalchemy import Engine
from sqlmodel import Session, SQLModel, create_engine

from utilities import envs

log = logging.getLogger(__name__)


def _get_engine(env: str):
    if env in envs.SQLITE_ENVS:
        # Test DB is created and destroyed with each run
        DATABASE_URL = "sqlite:///./rts_vis/databases/test.db"
        connect_args = {"check_same_thread": False}
        logging.debug(f"connecting to sqlite with url, {DATABASE_URL}")
        engine = create_engine(
            DATABASE_URL,
            connect_args=connect_args,
            pool_pre_ping=True,
            echo_pool=True,
        )
        SQLModel.metadata.create_all(engine)
    else:
        DATABASE_URL = f"postgresql+psycopg2://{environ['DB_USER']}:{environ['DB_PASS']}@{environ['DB_HOST']}:{environ['DB_PORT']}/{environ['DB_NAME']}"
        log.debug(f"connecting to SQL server for env {env}")
        connect_args = {}
        engine = create_engine(
            DATABASE_URL,
            echo_pool=True,
        )

    return engine


class DBEngine:
    _instance = None
    engine: Engine

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DBEngine, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "engine"):
            self.ensure_has_engine()

    def ensure_has_engine(self):
        if hasattr(self, "engine"):
            try:
                with self.engine.connect():
                    return
            except:
                log.info("DB connection failed, creating new engine")

        self.engine = _get_engine(envs.get_env())


def get_engine() -> Engine:
    """
    * env doesn't do anything here, but it's used in the original code so we have kwargs
    """
    return DBEngine().engine


def establish_connection():
    log.info("Attempting to establish DB connection...")
    attempts = 1
    while True:
        try:
            engine = get_engine()
            with engine.begin() as conn:
                log.info("DB connection successful")
            break
        except Exception as e:
            if attempts >= 5:
                log.error(f"DB connection failed ({attempts} attempts): {e}")
                raise e
            log.warning(
                f"DB connection attempt {attempts} failed (login errors are normal on first initialization): \n{e}"
            )
            log.info("Retrying in 5 seconds")
            attempts += 1
            sleep(5)

    return engine


def create_session() -> Session:
    return Session(bind=get_engine())


def get_session():
    sess = create_session()
    try:
        with sess as session:
            yield session
    except Exception as e:
        sess.close()
        log.error(f"Error getting session: {e}")
        raise e
    finally:
        sess.close()


def commit(db_objs: SQLModel | list[SQLModel], db: Session) -> list[SQLModel]:
    """
    Commits and refreshes list of database records
    """
    if not isinstance(db_objs, list):
        db_objs = [db_objs]

    if len(db_objs) == 1:
        return [_commit_one(db_objs[0], db)]
    elif len(db_objs) > 1:
        return _commit_many(db_objs, db)
    else:
        return []


def _commit_one(db_obj: SQLModel, db: Session) -> SQLModel:
    """
    Commits and refreshes a single database record
    """
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def _commit_many(db_objs: list[SQLModel], db: Session):
    """
    Commits list of database records without refreshing
    """
    db.bulk_save_objects(db_objs)
    db.commit()
    return db_objs


def delete(db_objs: list[SQLModel], db: Session):
    [db.delete(o) for o in db_objs]
    db.commit()
    return True


def migrate() -> None:
    """
    Migrates database tables programmatically
    This is called only at app startup in main.py
    """
    log.info("Attempting to run DB migrations")

    alembic_cfg = Config()
    alembic_cfg.set_main_option("script_location", "migrations")

    DATABASE_URL = f"postgresql+psycopg2://{environ['DB_USER']}:{environ['DB_PASS']}@{environ['DB_HOST']}:{environ['DB_PORT']}/{environ['DB_NAME']}"
    alembic_cfg.set_main_option("sqlalchemy.url", DATABASE_URL)

    log.info("Attempting to get current DB revision...")
    db_rev = None
    code_rev = None
    engine = _get_engine(env=environ.get("ENVIRONMENT", "dev"))
    with engine.begin() as conn:
        db_rev = migration.MigrationContext.configure(conn).get_current_revision()
        code_rev = ScriptDirectory.from_config(alembic_cfg).get_current_head()
    log.info(f"DB revision: {db_rev}, code revision: {code_rev}")

    if db_rev == code_rev:
        log.info(f"DB is up to date ({db_rev}), no migrations required")
        return

    try:
        log.info(f"DB revision: {db_rev}, code revision: {code_rev}")
        command.upgrade(alembic_cfg, "head")
        log.info("DB migrations complete, current DB revision: ")
        command.current(alembic_cfg)
    except Exception as e:
        log.error(f"DB migrations failed: {e}", exc_info=True)
        raise e
    finally:
        stdout.flush()


def ensure_disconnect():
    """
    Handles closing the database connection
    """
    log.info("Disconnecting from DB...")
    if DBEngine._instance and hasattr(DBEngine._instance, "engine"):
        DBEngine._instance.engine.dispose()
        DBEngine._instance = None
        log.info("Engine disposed successfully.")
    else:
        log.warning("Engine instance not found or already disposed.")
    log.info("DB disconnect complete\n")
    return True
