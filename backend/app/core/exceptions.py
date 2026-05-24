# ─────────────────────────────────────────
# 커스텀 예외 클래스
# ─────────────────────────────────────────


class MolibException(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code


class AIException(MolibException):
    def __init__(self, message: str = "AI 추천 요청에 실패했습니다."):
        super().__init__(
            code="AI_ERROR",
            message=message,
            status_code=502,
        )


class CacheException(MolibException):
    def __init__(self, message: str = "캐시 처리 중 오류가 발생했습니다."):
        super().__init__(
            code="CACHE_ERROR",
            message=message,
            status_code=500,
        )


class NotFoundException(MolibException):
    def __init__(self, message: str = "요청한 리소스를 찾을 수 없습니다."):
        super().__init__(
            code="NOT_FOUND",
            message=message,
            status_code=404,
        )


# ─────────────────────────────────────────
# 에러 응답 포맷
# ─────────────────────────────────────────


def error_response(code: str, message: str) -> dict:
    return {
        "error": {
            "code": code,
            "message": message,
        }
    }
