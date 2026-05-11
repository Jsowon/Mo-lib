import asyncio
import logging
from base64 import b64encode
from datetime import datetime, timedelta, timezone

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://accounts.spotify.com/api/token"
_SEARCH_URL = "https://api.spotify.com/v1/search"
_EXPIRY_BUFFER_SECONDS = 60


class SpotifyClient:
    def __init__(self) -> None:
        self._token: str | None = None
        self._token_expires_at: datetime = datetime(1970, 1, 1, tzinfo=timezone.utc)
        self._lock = asyncio.Lock()

    async def _ensure_token(self) -> str:
        now = datetime.now(timezone.utc)
        if (
            self._token
            and (self._token_expires_at - now).total_seconds() > _EXPIRY_BUFFER_SECONDS
        ):
            return self._token

        async with self._lock:
            now = datetime.now(timezone.utc)
            if (
                self._token
                and (self._token_expires_at - now).total_seconds()
                > _EXPIRY_BUFFER_SECONDS
            ):
                return self._token

            settings = get_settings()
            secret = settings.SPOTIFY_CLIENT_SECRET.get_secret_value()
            credentials = b64encode(
                f"{settings.SPOTIFY_CLIENT_ID}:{secret}".encode()
            ).decode()

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    _TOKEN_URL,
                    headers={
                        "Authorization": f"Basic {credentials}",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    content=b"grant_type=client_credentials",
                )
                if not response.is_success:
                    logger.error(
                        "Spotify 토큰 발급 실패 | status=%s | body=%s",
                        response.status_code,
                        response.text,
                    )
                    raise httpx.HTTPStatusError(
                        f"Spotify 토큰 발급 실패 "
                        f"{response.status_code}: {response.text}",
                        request=response.request,
                        response=response,
                    )
                data = response.json()

            self._token = data["access_token"]
            expires_in: int = data.get("expires_in", 3600)
            self._token_expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=expires_in
            )
            return self._token

    async def search_tracks(self, query: str, limit: int = 20) -> list[dict]:
        token = await self._ensure_token()
        async with httpx.AsyncClient() as client:
            response = await client.get(
                _SEARCH_URL,
                headers={"Authorization": f"Bearer {token}"},
                params={"q": query, "type": "track", "limit": limit},
            )
            response.raise_for_status()
            data = response.json()
        return data["tracks"]["items"]


spotify_client = SpotifyClient()
