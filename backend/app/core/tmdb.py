import logging

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

_SEARCH_URL = "https://api.themoviedb.org/3/search/movie"


class TMDBClient:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def search_movies(self, query: str, limit: int = 10) -> list[dict]:
        """TMDB 영화 검색 API 호출"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    _SEARCH_URL,
                    params={
                        "api_key": self.settings.TMDB_API_KEY,
                        "query": query,
                        "language": "ko-KR",
                        "page": 1,
                    },
                )
                response.raise_for_status()
                data = response.json()
                return data.get("results", [])[:limit]
            except httpx.HTTPError as e:
                logger.error(f"TMDB API 호출 실패: {str(e)}")
                raise e


tmdb_client = TMDBClient()
