from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # DB
    DATABASE_URL: str

    # JWT — SecretStr: 로그/디버그 출력 시 자동 마스킹
    JWT_SECRET_KEY: SecretStr
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # bcrypt
    BCRYPT_ROUNDS: int = 12

    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:8081"

    # 외부 API — Secret 계열은 SecretStr 적용
    TMDB_API_KEY: str
    SPOTIFY_CLIENT_ID: str
    SPOTIFY_CLIENT_SECRET: SecretStr
    ALADIN_TTB_KEY: SecretStr
    GEMINI_API_KEY: SecretStr

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """
    FastAPI Depends() 주입용. lru_cache로 싱글턴 보장.
    테스트 시 get_settings.cache_clear()로 초기화 가능.
    """
    return Settings()
