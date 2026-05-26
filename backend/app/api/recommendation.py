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


def make_cache_key(content_id: str, domain: str, exclude_domains: list[str]) -> str:
    """캐시 키 생성"""
    exclude_str = ",".join(sorted(exclude_domains))
    return f"{domain}:{content_id}:exclude:{exclude_str}"


@router.post("", response_model=RecommendationResponse)
async def get_recommendation(
    request: RecommendationRequest, db: AsyncSession = Depends(get_db)
):
    """
    콘텐츠 입력 시 크로스 도메인 추천 요청
    - 캐시 있으면 캐시 반환
    - 캐시 없으면 Gemini 호출 후 캐시 저장
    """
    # 1. 캐시 조회
    cache_key = make_cache_key(
        request.content_id, request.domain, request.exclude_domains
    )
    result = await db.execute(
        select(RecommendationCache).where(RecommendationCache.cache_key == cache_key)
    )
    cached = result.scalar_one_or_none()

    if cached:
        return RecommendationResponse(**cached.result)

    # 2. Gemini 호출
    ai_request = AIRecommendationRequest(
        domain=request.domain,
        content_id=request.content_id,
        title=request.title,
        metadata=request.metadata,
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

    # 4. 캐시 저장
    cache = RecommendationCache(
        cache_key=cache_key,
        result=response.model_dump(mode="json"),
    )
    db.add(cache)
    await db.commit()

    return response
