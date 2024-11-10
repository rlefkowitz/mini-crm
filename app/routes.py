import logging
import os
import secrets
from os import environ as env

from fastapi import Depends, HTTPException, openapi, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlmodel import Session, text

from app.databases.database import get_session
from app.routers import router

log = logging.getLogger(__name__)

security = HTTPBasic()  # Basic Auth for API Docs


def get_current_username(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, env["ADMIN_USER"])
    correct_password = secrets.compare_digest(credentials.password, env["ADMIN_PASS"])
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


@router.get("/health")
def health_check(db: Session = Depends(get_session)):
    checks = {
        "db_connection": False,
        "db_revision": check_db_connection(db),
    }
    checks["db_connection"] = bool(checks.get("db_revision"))

    if not all(checks.values()):
        failed_checks = [check for check, result in checks.items() if not result]
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health Check Failed: {failed_checks}",
        )

    external_checks = {
        "git_commit_hash": os.getenv("GIT_HASH", False),
    }
    for check, result in external_checks.items():
        if not result:
            log.info(f'Health Check: failed check "{check}"')

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={"checks": checks, "external_checks": external_checks},
    )


def check_db_connection(db: Session):
    try:
        conn_count = db.exec(
            text("SELECT COUNT(sa.*) FROM pg_catalog.pg_stat_activity sa")
        ).first()
        try:
            log.info(f"{conn_count[0]} open connection(s).")
        except Exception as e:
            log.warning(f"Issue accessing connection count: {e}")
        return True
    except Exception as e:
        log.error(f"DB health checks failed! {e}")
        return False


@router.get("/docs", include_in_schema=False)
async def get_docs(username: str = Depends(get_current_username)):
    return openapi.docs.get_swagger_ui_html(
        openapi_url="/openapi.json", title="Common App API Docs"
    )


@router.get("/redoc", include_in_schema=False)
async def get_redoc(username: str = Depends(get_current_username)):
    return openapi.docs.get_redoc_html(
        openapi_url="/openapi.json", title="Common App API Redoc"
    )


@router.get("/openapi.json", include_in_schema=False)
async def get_openapi(username: str = Depends(get_current_username)):
    return openapi.utils.get_openapi(
        title="Common App API Spec", version="0.1.0", routes=router.routes
    )
