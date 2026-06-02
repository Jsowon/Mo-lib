from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AIException
from app.database import get_db
from app.models.cache import RecommendationCache
from app.schemas.ai_interface import AIRecommendationRequest
from app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.ai_service import get_ai_recommendation

router = APIRouter(prefix="/recommendations", tags=["recommendation"])

CACHE_TTL_HOURS = 24


def normalize_metadata(domain: str, metadata: dict) -> dict:
    """검색 API 응답(ContentItem)을 추천 API metadata 형식으로 변환"""
    genre = metadata.get("genre", [])
    genre_str = genre[0] if isinstance(genre, list) and genre else genre or ""

    if domain == "movie":
        return {
            "genre": genre_str,
            "synopsis": metadata.get("description", ""),
            "director": metadata.get("creator", ""),
        }
    elif domain == "book":
        return {
            "genre": genre_str,
            "description": metadata.get("description", ""),
            "author": metadata.get("creator", ""),
        }
    elif domain == "music":
        return {
            "genre": genre_str,
            "artist": metadata.get("creator", ""),
        }
    return metadata


def make_cache_key(content_id: str, domain: str, exclude_domains: list[str]) -> str:
    exclude_str = ",".join(sorted(exclude_domains))
    return f"{domain}:{content_id}:exclude:{exclude_str}"


@router.post(
    "",
    response_model=RecommendationResponse,
    summary="크로스 도메인 콘텐츠 추천",
    description="콘텐츠 정보를 입력하면 Gemini AI가 영화·음악·도서를 추천합니다. 동일 요청은 24시간 캐시됩니다.",  # noqa: E501
)
async def get_recommendation(
    request: RecommendationRequest, db: AsyncSession = Depends(get_db)
):
    # 1. 캐시 조회
    cache_key = make_cache_key(
        request.content_id, request.domain, request.exclude_domains
    )
    result = await db.execute(
        select(RecommendationCache).where(RecommendationCache.cache_key == cache_key)
    )
    cached = result.scalar_one_or_none()

    if cached:
        now = datetime.now(timezone.utc)
        if cached.expires_at is None or cached.expires_at > now:
            return RecommendationResponse(**cached.result)
        # 만료된 캐시 제거 후 재요청
        await db.delete(cached)
        await db.flush()

    # 2. Gemini 호출
    ai_request = AIRecommendationRequest(
        domain=request.domain,
        content_id=request.content_id,
        title=request.title,
        metadata=normalize_metadata(request.domain, request.metadata),
        history=request.history,
        exclude_domains=request.exclude_domains,
    )

    try:
        ai_response = await get_ai_recommendation(ai_request)
    except AIException:
        raise
    except Exception:
        raise AIException()

    # 3. 응답 구성
    response = RecommendationResponse(
        recommendations=ai_response.recommendations, map_title=ai_response.map_title
    )

    # 4. 캐시 저장 (24시간 TTL)
    cache = RecommendationCache(
        cache_key=cache_key,
        result=response.model_dump(mode="json"),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=CACHE_TTL_HOURS),
    )
    db.add(cache)
    await db.commit()

    return response
