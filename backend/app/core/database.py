from collections.abc import Generator

from sqlalchemy import Engine
from sqlmodel import Session, create_engine

from app.core.config import settings


def _normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql+asyncpg://"):
        return database_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


def _connect_args(database_url: str) -> dict[str, bool]:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


database_url = _normalize_database_url(settings.database_url)
engine: Engine = create_engine(
    database_url,
    echo=settings.debug,
    pool_pre_ping=not database_url.startswith("sqlite"),
    connect_args=_connect_args(database_url),
)


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
