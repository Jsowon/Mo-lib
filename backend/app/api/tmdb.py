import logging

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.normalizer import ContentItem, normalize_tmdb_movie
from app.core.tmdb import tmdb_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


class MovieSearchResponse(BaseModel):
    results: list[ContentItem]
    total: int
    error: str | None = None


@router.get("/movie", response_model=MovieSearchResponse)
async def search_movie(
    q: str = Query(..., min_length=1, description="영화 검색어"),
    limit: int = Query(10, ge=1, le=20, description="결과 수"),
):
    try:
        items = await tmdb_client.search_movies(query=q, limit=limit)
    except httpx.HTTPStatusError as e:
        logger.warning("TMDB API 오류: %s", e.response.status_code)
        return MovieSearchResponse(results=[], total=0, error=f"TMDB API 오류: {e.response.status_code}")
    except httpx.HTTPError:
        logger.warning("TMDB 서비스 연결 실패")
        return MovieSearchResponse(results=[], total=0, error="TMDB 서비스에 연결할 수 없습니다.")

    return MovieSearchResponse(
        results=[normalize_tmdb_movie(i) for i in items], total=len(items)
    )
