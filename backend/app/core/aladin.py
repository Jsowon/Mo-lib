import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

_SEARCH_URL = "http://www.aladin.co.kr/ttb/api/ItemSearch.aspx"


class AladinClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def search_books(self, query: str, limit: int = 10) -> list[dict]:
        """알라딘 도서 검색 API 호출"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    _SEARCH_URL,
                    params={
                        "ttbkey": self.settings.ALADIN_TTB_KEY.get_secret_value(),
                        "Query": query,
                        "QueryType": "Keyword",
                        "MaxResults": limit,
                        "start": 1,
                        "SearchTarget": "Book",
                        "output": "js",
                        "Version": "20131101",
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data.get("item", [])
            except httpx.HTTPError as e:
                logger.error(f"Aladin API 호출 실패: {str(e)}")
                raise e


aladin_client = AladinClient()
