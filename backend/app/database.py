from functools import lru_cache

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings


@lru_cache
def get_engine():
    """
    비동기 엔진 lazy 생성.
    - CI에서 DB 컨테이너 없이 import smoke test 가능
    - 테스트 시 get_engine.cache_clear()로 재초기화 가능
    """
    settings = get_settings()
    # postgresql+asyncpg로 변경
    url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    return create_async_engine(url, echo=False)


@lru_cache
def get_sessionmaker():
    """AsyncSessionLocal lazy 생성"""
    return sessionmaker(
        get_engine(),
        class_=AsyncSession,
        expire_on_commit=False,
    )


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI 의존성 주입용 비동기 DB 세션"""
    AsyncSessionLocal = get_sessionmaker()
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
