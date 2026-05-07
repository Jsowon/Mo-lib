import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.spotify import spotify_client

router = APIRouter(prefix="/search", tags=["search"])


class TrackResult(BaseModel):
    id: str
    title: str
    artists: list[str]
    album: str
    image_url: str | None
    release_date: str | None
    duration_ms: int
    preview_url: str | None
    external_url: str


class MusicSearchResponse(BaseModel):
    results: list[TrackResult]
    total: int


def _normalize(item: dict) -> TrackResult:
    images = item.get("album", {}).get("images", [])
    return TrackResult(
        id=item["id"],
        title=item["name"],
        artists=[a["name"] for a in item.get("artists", [])],
        album=item.get("album", {}).get("name", ""),
        image_url=images[0]["url"] if images else None,
        release_date=item.get("album", {}).get("release_date"),
        duration_ms=item.get("duration_ms", 0),
        preview_url=item.get("preview_url"),
        external_url=item.get("external_urls", {}).get("spotify", ""),
    )


@router.get("/music", response_model=MusicSearchResponse)
async def search_music(
    q: str = Query(..., min_length=1, description="검색어"),
    limit: int = Query(10, ge=1, le=10, description="결과 수 (최대 10, Spotify 개발자 앱 제한)"),
):
    try:
        items = await spotify_client.search_tracks(query=q, limit=limit)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"Spotify API 오류: {e.response.status_code}")
    except httpx.HTTPError:
        raise HTTPException(status_code=503, detail="Spotify 서비스에 연결할 수 없습니다.")

    return MusicSearchResponse(results=[_normalize(i) for i in items], total=len(items))
