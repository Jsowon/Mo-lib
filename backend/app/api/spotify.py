import logging

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.normalizer import ContentItem, normalize_spotify_track
from app.core.spotify import spotify_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


class MusicSearchResponse(BaseModel):
    results: list[ContentItem]
    total: int
    error: str | None = None


@router.get(
    "/music",
    response_model=MusicSearchResponse,
    summary="음악 검색",
    description="Spotify에서 음악을 검색합니다. API 장애 시 빈 결과와 error 메시지를 반환합니다.",  # noqa: E501
)
async def search_music(
    q: str = Query(..., min_length=1, description="검색어"),
    limit: int = Query(
        10, ge=1, le=10, description="결과 수 (최대 10, Spotify 개발자 앱 제한)"
    ),
):
    try:
        items = await spotify_client.search_tracks(query=q, limit=limit)
    except httpx.HTTPStatusError as e:
        logger.warning("Spotify API 오류: %s", e.response.status_code)
        return MusicSearchResponse(
            results=[], total=0, error=f"Spotify API 오류: {e.response.status_code}"
        )
    except httpx.HTTPError:
        logger.warning("Spotify 서비스 연결 실패")
        return MusicSearchResponse(
            results=[], total=0, error="Spotify 서비스에 연결할 수 없습니다."
        )

    return MusicSearchResponse(
        results=[normalize_spotify_track(i) for i in items], total=len(items)
    )
