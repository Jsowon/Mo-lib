import uuid
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class RecommendationCache(Base):
    __tablename__ = "recommendation_cache"

    # 각 캐시 행의 고유 ID
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # "노르웨이의 숲_book"처럼 콘텐츠명 + 도메인 조합
    cache_key: Mapped[str] = mapped_column(
        String(400), nullable=False, unique=True, index=True
    )
    # GPT로부터 받은 추천 결과를 JSON 형태로 저장
    result: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # 캐시가 저장된 시간
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    # 캐시의 만료 시간
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
