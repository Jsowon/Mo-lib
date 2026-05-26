from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings

settings = get_settings()

# 비동기 엔진 생성
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
)

# 비동기 세션 팩토리
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# FastAPI Depends용 세션 생성 함수
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
