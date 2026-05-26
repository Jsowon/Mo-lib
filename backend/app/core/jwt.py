from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt

from app.config import get_settings


def create_access_token(user_id: str) -> str:
    """JWT 액세스 토큰 생성."""
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": user_id,
        "exp": expire,
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY.get_secret_value(),
        algorithm=settings.JWT_ALGORITHM,
    )


def decode_token(token: str) -> dict:
    """
    JWT 토큰 디코드. 유효하면 payload 반환, 실패 시 None.
    """
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY.get_secret_value(),
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        return None
