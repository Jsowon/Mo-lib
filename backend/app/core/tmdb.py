import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"


class TMDBClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def search_movies(
        self, query: str, limit: int = 10, year: int | None = None
    ) -> list[dict]:
        """TMDB 영화 검색 API 호출"""
        params: dict = {
            "api_key": self.settings.TMDB_API_KEY,
            "query": query,
            "language": "ko-KR",
            "include_adult": "false",
            "page": 1,
        }
        if year:
            params["primary_release_year"] = year
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    _SEARCH_URL,
                    params=params,
                )
                response.raise_for_status()
                data = response.json()
                # 결과를 limit 개수만큼 슬라이싱하여 반환
                return data.get("results", [])[:limit]
            except httpx.HTTPError as e:
                logger.error(f"TMDB API 호출 실패: {str(e)}")
                raise e


tmdb_client = TMDBClient()
