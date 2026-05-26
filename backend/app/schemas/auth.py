from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72, description="비밀번호 (8~72자)")
    nickname: str = Field(min_length=1, max_length=30, description="닉네임")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    nickname: str

    model_config = {"from_attributes": True}
