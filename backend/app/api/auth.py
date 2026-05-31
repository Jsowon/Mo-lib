from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.core.jwt import create_access_token
from app.database import get_db
from app.errors import AuthenticationError, DuplicateError
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    SignupRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.common import MessageResponse
from app.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=201,
    summary="회원가입",
)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    # 이메일 중복 검사
    result = await db.execute(select(User).filter(User.email == body.email))
    existing = result.scalars().first()
    if existing:
        raise DuplicateError("이미 등록된 이메일입니다.")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        nickname=body.nickname,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="로그인",
)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).filter(User.email == body.email))
    user = result.scalars().first()
    if not user or not verify_password(body.password, user.password_hash):
        raise AuthenticationError("이메일 또는 비밀번호가 올바르지 않습니다.")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token)


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="로그아웃",
)
async def logout(_current_user: User = Depends(get_current_user)):
    """프론트에서 토큰 삭제. 서버는 200만 반환."""
    return MessageResponse(message="로그아웃되었습니다.")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="내 정보 조회",
)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        nickname=current_user.nickname,
    )
