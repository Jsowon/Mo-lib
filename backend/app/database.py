from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings


@lru_cache
def get_engine() -> Engine:
    """
    엔진을 lazy하게 생성. 모듈 import 시점에 DB에 연결하지 않음.
    - CI에서 DB 컨테이너 없이 import smoke test 가능
    - 테스트 시 get_engine.cache_clear()로 재초기화 가능
    """
    return create_engine(get_settings().DATABASE_URL)


@lru_cache
def get_sessionmaker():
    """SessionLocal도 lazy 생성."""
    return sessionmaker(autocommit=False, autoflush=False, bind=get_engine())


class Base(DeclarativeBase):
    pass


def get_db():
    """FastAPI 의존성 주입용 DB 세션 생성자"""
    SessionLocal = get_sessionmaker()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
