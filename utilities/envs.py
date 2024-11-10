import os

DEV = "dev"
TEST = "test"
QA = "qa"
STAGING = "staging"
PROD = "prod"

# ENVs that use a SQLite DB
SQLITE_ENVS = {TEST}

# ENVs that run locally
LOCAL_ENVS = {DEV, TEST}

# ENVs that are hosted somewhere
HOSTED_ENVS = {QA, STAGING, PROD}


@staticmethod
def get_env() -> str:
    """
    Returns the current environment, defaulting to dev
    """
    return os.environ.get("ENVIRONMENT", DEV)


@staticmethod
def is_prod() -> bool:
    """
    Returns True if the current environment is prod
    """
    return get_env() == PROD


@staticmethod
def is_nonprod() -> bool:
    """
    Returns True if the current environment is not prod
    """
    return get_env() != PROD
