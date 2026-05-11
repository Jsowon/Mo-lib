import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.normalizer import ContentItem, normalize_spotify_track
from app.core.spotify import spotify_client

router = APIRouter(prefix="/search", tags=["search"])


class MusicSearchResponse(BaseModel):
    results: list[ContentItem]
    total: int


@router.get("/music", response_model=MusicSearchResponse)
async def search_music(
    q: str = Query(..., min_length=1, description="검색어"),
    limit: int = Query(
        10, ge=1, le=10, description="결과 수 (최대 10, Spotify 개발자 앱 제한)"
    ),
):
    try:
        items = await spotify_client.search_tracks(query=q, limit=limit)
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502, detail=f"Spotify API 오류: {e.response.status_code}"
        )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=503, detail="Spotify 서비스에 연결할 수 없습니다."
        )

    return MusicSearchResponse(
        results=[normalize_spotify_track(i) for i in items], total=len(items)
    )
