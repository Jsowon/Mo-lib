import logging

import httpx
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.core.aladin import aladin_client
from app.core.normalizer import ContentItem, normalize_aladin_book

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/search", tags=["search"])


class BookSearchResponse(BaseModel):
    results: list[ContentItem]
    total: int
    error: str | None = None


@router.get("/book", response_model=BookSearchResponse)
async def search_book(
    q: str = Query(..., min_length=1, description="도서 검색어"),
    limit: int = Query(10, ge=1, le=20, description="결과 수"),
):
    try:
        items = await aladin_client.search_books(query=q, limit=limit)
    except httpx.HTTPStatusError as e:
        logger.warning("알라딘 API 오류: %s", e.response.status_code)
        return BookSearchResponse(results=[], total=0, error=f"알라딘 API 오류: {e.response.status_code}")
    except httpx.HTTPError:
        logger.warning("알라딘 서비스 연결 실패")
        return BookSearchResponse(results=[], total=0, error="알라딘 서비스에 연결할 수 없습니다.")

    return BookSearchResponse(
        results=[normalize_aladin_book(i) for i in items], total=len(items)
    )
