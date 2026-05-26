import json

import httpx

from app.config import get_settings
from app.core.exceptions import AIException
from app.schemas.ai_interface import (
    AIRecommendationItem,
    AIRecommendationRequest,
    AIRecommendationResponse,
    HistoryItem,
)

settings = get_settings()

# ─────────────────────────────────────────
# 프롬프트 빌더
# ─────────────────────────────────────────


def build_prompt(request: AIRecommendationRequest) -> str:
    history_text = ""
    if request.history:
        last = request.history[-1]
        history_text = f"""
이전 선택 콘텐츠:
- 도메인: {last.domain}
- 제목: {last.title}
- 감성 키워드: {", ".join(last.context_keywords)}
- 연결 키워드: {last.connection_keyword}
"""

    all_domains = ["film", "book", "music"]
    target_domains = [d for d in all_domains if d not in request.exclude_domains]

    return f"""
당신은 감성 기반 크로스 도메인 콘텐츠 추천 전문가입니다.

현재 콘텐츠:
- 도메인: {request.domain}
- 제목: {request.title}
- 메타데이터: {request.metadata}
{history_text}

위 콘텐츠의 감성과 분위기를 분석하고,
아래 도메인에서 각각 4개씩 추천해주세요.
추천 도메인: {", ".join(target_domains)}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만 반환하세요.

{{
    "recommendations": {{
        "film": [
            {{
                "title": "콘텐츠 제목",
                "reason": "추천 이유 한 문장",
                "tags": ["감성태그1", "감성태그2", "감성태그3"],
                "connection_keyword": "연결키워드 한 단어"
            }}
        ],
        "book": [],
        "music": []
    }},
    "map_title": "지도 제목 (탐색 흐름을 나타내는 짧은 제목, 첫 추천이면 null)"
}}
"""


# ─────────────────────────────────────────
# Gemini API 호출
# ─────────────────────────────────────────


async def call_gemini(prompt: str) -> dict:
    api_key = settings.GEMINI_API_KEY.get_secret_value()
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_key}"

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "responseMimeType": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
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


def parse_gemini_response(raw: dict) -> AIRecommendationResponse:
    try:
        text = raw["candidates"][0]["content"]["parts"][0]["text"]
        data = json.loads(text)

        recommendations = {}
        for domain, items in data["recommendations"].items():
            recommendations[domain] = [
                AIRecommendationItem(
                    title=item["title"],
                    reason=item["reason"],
                    tags=item["tags"],
                    connection_keyword=item["connection_keyword"],
                )
                for item in items
            ]

        return AIRecommendationResponse(
            recommendations=recommendations, map_title=data.get("map_title")
        )
    except (KeyError, json.JSONDecodeError):
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
    prompt = build_prompt(request)
    raw = await call_gemini(prompt)
    return parse_gemini_response(raw)
