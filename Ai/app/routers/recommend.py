# 엔드포인트 정의
import time
from fastapi import APIRouter, HTTPException
from google.genai import errors
from app.config import ALL_DOMAINS
from app.services.llm import run_stage1, run_stage2

router = APIRouter()

DOMAIN_SAMPLES = {
    "film": {
        "title": "인터스텔라", "genre": "SF",
        "synopsis": "인류 생존을 위해 우주 웜홀을 통과하는 탐험대의 여정. 시간 왜곡 속에서 아버지와 딸의 유대가 물리 법칙을 초월한다.",
        "director": "크리스토퍼 놀란", "year": 2014,
    },
    "book": {
        "title": "채식주의자", "genre": "문학소설",
        "description": "평범한 여성 영혜가 어느 날 육식을 거부하고 식물이 되려 하면서 벌어지는 이야기.",
        "author": "한강",
    },
    "music": {
        "title": "Blinding Lights", "genre": "Synth-pop",
        "artist": "The Weeknd",
        "mood_tags": ["고에너지", "향수", "밤", "드라이브", "긴박함"],
    },
}


def validate_recommendations(domain: str, result: dict) -> dict:
    recs = result.get("recommendations", {})
    issues = []

    missing = [d for d in ALL_DOMAINS if d not in recs]
    if missing:
        issues.append(f"누락된 도메인: {missing}")

    for d, items in recs.items():
        titles = [item.get("title", "") for item in items]
        if len(titles) != len(set(titles)):
            issues.append(f"{d} 추천 내 중복 제목: {titles}")

    return {
        "input_domain": domain,
        "present_domains": list(recs.keys()),
        "issues": issues if issues else "이상 없음 ✅",
    }


@router.get("/test/recommend/{domain}")
async def test_recommend(domain: str, exclude: str = ""):
    if domain not in ALL_DOMAINS:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 도메인: '{domain}'")

    exclude_domains = [d.strip() for d in exclude.split(",") if d.strip()] if exclude else []

    start = time.time()
    try:
        stage1_result = await run_stage1(domain, DOMAIN_SAMPLES[domain])
        if "error" in stage1_result:
            raise HTTPException(status_code=500, detail="Stage 1 파싱 실패")

        stage2_result = await run_stage2(
            analysis=stage1_result.get("analysis", {}),
            history=[],
            exclude_domains=exclude_domains,
        )

        return {
            "latency_sec": round(time.time() - start, 3),
            "validation": validate_recommendations(domain, stage2_result),
            "stage1": stage1_result,
            "recommendations": stage2_result.get("recommendations", {}),
            "grounding_used": stage2_result.get("grounding_used"),
        }
    except errors.ClientError as e:
        code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=str(e))