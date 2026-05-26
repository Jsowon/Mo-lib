from typing import Optional

from pydantic import BaseModel

from app.schemas.ai_interface import AIRecommendationItem, HistoryItem

# ─────────────────────────────────────────
# 추천 요청 (프론트 → 백엔드)
# ─────────────────────────────────────────


class RecommendationRequest(BaseModel):
    domain: str  # film / book / music
    content_id: str
    title: str
    metadata: dict
    history: list[HistoryItem] = []
    exclude_domains: list[str] = []


# ─────────────────────────────────────────
# 추천 응답 (백엔드 → 프론트)
# ─────────────────────────────────────────


class RecommendationResponse(BaseModel):
    recommendations: dict[str, list[AIRecommendationItem]]  # 도메인별 추천 목록
    map_title: Optional[str] = None
