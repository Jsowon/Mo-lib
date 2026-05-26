from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """공통 앱 예외 베이스."""

    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail


class DuplicateError(AppError):
    """이미 존재하는 리소스 (409)."""

    def __init__(self, detail: str = "이미 존재합니다."):
        super().__init__(409, detail)


class AuthenticationError(AppError):
    """인증 실패 (401)."""

    def __init__(self, detail: str = "인증에 실패했습니다."):
        super().__init__(401, detail)


class NotFoundError(AppError):
    """리소스 없음 (404)."""

    def __init__(self, detail: str = "리소스를 찾을 수 없습니다."):
        super().__init__(404, detail)


def register_error_handlers(app: FastAPI) -> None:
    """글로벌 에러 핸들러 등록."""

    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_request: Request, _exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"detail": "서버 내부 오류가 발생했습니다."},
        )
