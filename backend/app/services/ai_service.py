import httpx

from app.core.exceptions import AIException
from app.schemas.ai_interface import (
    AIRecommendationItem,
    AIRecommendationRequest,
    AIRecommendationResponse,
    HistoryItem,
)

AI_SERVER_URL = "http://ai:8000/recommend"


# ─────────────────────────────────────────
# AI 서버 호출
# ─────────────────────────────────────────


async def call_ai_server(request: AIRecommendationRequest) -> dict:
    payload = request.model_dump()

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(AI_SERVER_URL, json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.TimeoutException:
        raise AIException("AI 응답 시간이 초과됐습니다. 잠시 후 다시 시도해주세요.")
    except httpx.HTTPStatusError as e:
        raise AIException(
            f"AI 서버 오류가 발생했습니다. (status: {e.response.status_code})"
        )
    except Exception:
        raise AIException("AI 추천 요청에 실패했습니다.")


# ─────────────────────────────────────────
# 응답 파싱
# ─────────────────────────────────────────


def parse_ai_response(raw: dict) -> AIRecommendationResponse:
    try:
        recommendations = {}
        for domain, items in raw["recommendations"].items():
            recommendations[domain] = [
                AIRecommendationItem(
                    title=item["title"],
                    original_title=item.get("original_title"),
                    year=item.get("year"),
                    author=item.get("author"),
                    artist=item.get("artist"),
                    reason=item["reason"],
                    tags=item["tags"],
                    connection_keyword=item["connection_keyword"],
                )
                for item in items
            ]

        return AIRecommendationResponse(
            recommendations=recommendations, map_title=raw.get("map_title")
        )
    except (KeyError, TypeError):
        raise AIException("AI 응답을 처리하는 데 실패했습니다.")


# ─────────────────────────────────────────
# history 구성 함수
# ─────────────────────────────────────────


def build_ai_history(node) -> list[HistoryItem]:
    """직전 노드 1개의 emotion_tags를 history로 변환"""
    if not node:
        return []
    return [
        HistoryItem(
            step=node.step_order,
            domain=node.domain,
            title=node.title,
            context_keywords=node.emotion_tags or [],
            connection_keyword=None,
        )
    ]


# ─────────────────────────────────────────
# 메인 추천 함수
# ─────────────────────────────────────────


async def get_ai_recommendation(
    request: AIRecommendationRequest,
) -> AIRecommendationResponse:
    raw = await call_ai_server(request)
    return parse_ai_response(raw)
