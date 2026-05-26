import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.core.aladin import aladin_client
from app.core.normalizer import ContentItem, normalize_aladin_book

router = APIRouter(prefix="/search", tags=["search"])


class BookSearchResponse(BaseModel):
    results: list[ContentItem]
    total: int


@router.get("/book", response_model=BookSearchResponse)
async def search_book(
    q: str = Query(..., min_length=1, description="도서 검색어"),
    limit: int = Query(10, ge=1, le=20, description="결과 수"),
):
    try:
        items = await aladin_client.search_books(query=q, limit=limit)
    except httpx.HTTPError:
        raise HTTPException(
            status_code=503, detail="알라딘 서비스에 연결할 수 없습니다."
        )

    return BookSearchResponse(
        results=[normalize_aladin_book(i) for i in items], total=len(items)
    )
