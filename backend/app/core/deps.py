import uuid

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.jwt import decode_token
from app.database import get_db
from app.errors import AuthenticationError
from app.models.user import User

security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Authorization: Bearer <token> 에서 유저 추출.
    토큰 무효 또는 유저 미존재 시 401.
    """
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise AuthenticationError("유효하지 않은 토큰입니다.")

    user_id = payload.get("sub")
    if user_id is None:
        raise AuthenticationError("유효하지 않은 토큰입니다.")

    try:
        result = await db.execute(select(User).filter(User.id == uuid.UUID(user_id)))
        user = result.scalars().first()
    except (ValueError, AttributeError):
        raise AuthenticationError("유효하지 않은 토큰입니다.")

    if user is None:
        raise AuthenticationError("유저를 찾을 수 없습니다.")

    return user
