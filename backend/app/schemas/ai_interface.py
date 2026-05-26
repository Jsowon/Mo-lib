from typing import Optional

from pydantic import BaseModel

# ─────────────────────────────────────────
# 도메인별 metadata 스키마
# ─────────────────────────────────────────


class FilmMetadata(BaseModel):
    genre: Optional[str] = None
    synopsis: Optional[str] = None
    year: Optional[int] = None
    director: Optional[str] = None


class BookMetadata(BaseModel):
    genre: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None


class MusicMetadata(BaseModel):
    genre: Optional[str] = None
    artist: Optional[str] = None
    mood_tags: Optional[list[str]] = None


# ─────────────────────────────────────────
# history 항목 스키마
# ─────────────────────────────────────────


class HistoryItem(BaseModel):
    step: int
    domain: str
    title: str
    context_keywords: list[str]
    connection_keyword: Optional[str] = None


# ─────────────────────────────────────────
# AI 요청 스키마 (백엔드 → AI)
# ─────────────────────────────────────────


class AIRecommendationRequest(BaseModel):
    schema_version: str = "1.0"
    domain: str  # film / book / music
    content_id: str
    title: str
    metadata: dict
    history: list[HistoryItem] = []
    exclude_domains: list[str] = []


# ─────────────────────────────────────────
# AI 응답 스키마 (AI → 백엔드)
# ─────────────────────────────────────────


class AIRecommendationItem(BaseModel):
    title: str
    reason: str
    tags: list[str]
    connection_keyword: str  # 노드 간 연결 키워드 (한 단어)


class AIRecommendationResponse(BaseModel):
    recommendations: dict[str, list[AIRecommendationItem]]  # 도메인별 추천 목록
    map_title: Optional[str] = None
