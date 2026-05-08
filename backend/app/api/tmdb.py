import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.normalizer import ContentItem, normalize_tmdb_movie
from app.core.tmdb import tmdb_client

router = APIRouter(prefix="/search", tags=["search"])

class MovieSearchResponse(BaseModel):
    results: list[ContentItem]
    total: int

@router.get("/movie", response_model=MovieSearchResponse)
async def search_movie(
    q: str = Query(..., min_length=1, description="영화 검색어"),
    limit: int = Query(10, ge=1, le=20, description="결과 수")
):
    try:
        items = await tmdb_client.search_movies(query=q, limit=limit)
    except httpx.HTTPError:
        raise HTTPException(
            status_code=503, detail="TMDB 서비스에 연결할 수 없습니다."
        )

    return MovieSearchResponse(
        results=[normalize_tmdb_movie(i) for i in items], 
        total=len(items)
    )