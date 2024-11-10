from logging.config import fileConfig
from os import environ

from alembic import context
from alembic.config import Config
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

load_dotenv(override=True)

from app.models.relationship import *
from app.models.schema import *
from app.models.user import *
from utilities import envs

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.

config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# server_default is not supported by SQLModel?
# config.set_main_option("compare_server_default", "true")

config.set_main_option("compare_type", "true")

# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = SQLModel.metadata

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.
DATABASE_URL = f"postgresql+psycopg2://{environ['DB_USER']}:{environ['DB_PASS']}@{environ['DB_HOST']}:{environ['DB_PORT']}/{environ['DB_NAME']}"  # [?key=value&key=value...]"
config.set_main_option("sqlalchemy.url", DATABASE_URL)


def include_object(object, name, type_, reflected, compare_to):
    if object.info.get("skip_autogenerate", False):
        return False
    else:
        return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    # print(config.get_section(config.config_ini_section))
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
