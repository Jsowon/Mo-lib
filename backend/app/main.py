from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.config import Settings, get_settings
from app.errors import register_error_handlers

app = FastAPI(
    title="Mo:lib",
    description="몰입 지도 기반 크로스 도메인 콘텐츠 추천 API",
    version="0.1.0",
)


def _setup_cors(application: FastAPI, settings: Settings) -> None:
    origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")]
    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


_setup_cors(app, get_settings())
register_error_handlers(app)

# --- routers ---
app.include_router(auth_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health_check():
    """서버 상태 확인"""
    return {"status": "ok", "service": "Mo:lib"}
