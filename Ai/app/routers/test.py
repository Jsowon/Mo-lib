import json
import time
from fastapi import APIRouter, HTTPException
from google.genai import errors, types
from app.config import STAGE1_CLIENT, STAGE1_MODEL, STAGE2_CLIENT, STAGE2_MODEL, GOOGLE_SEARCH_TOOL, ALL_DOMAINS
from app.prompts.stage2 import STAGE2_SYSTEM_PROMPT
from app.services.llm import run_stage1, run_stage2, call_with_grounding_fallback
from app.utils.parser import parse_llm_response

router = APIRouter()

SAMPLES = {
    "film": {
        "title": "인터스텔라", "genre": "SF",
        "synopsis": "인류 생존을 위해 우주 웜홀을 통과하는 탐험대의 여정. 시간 왜곡 속에서 아버지와 딸의 유대가 물리 법칙을 초월한다.",
        "director": "크리스토퍼 놀란", "year": 2014,
    },
    "book": {
        "title": "채식주의자", "genre": "문학소설",
        "description": "평범한 여성 영혜가 어느 날 육식을 거부하고 식물이 되려 하면서 벌어지는 이야기. 폭력, 욕망, 자유 의지를 탐색한다.",
        "author": "한강",
    },
    "music": {
        "title": "벚꽃엔딩", "genre": "인디팝",
        "artist": "버스커버스커",
        "mood_tags": ["설렘", "청춘", "따뜻함", "밝음"]
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
        "issues": issues if issues else "이상 없음",
    }


@router.get("/health")
def health_check():
    return {"status": "ok", "message": "Mo:lib AI server is running"}


@router.get("/test")
async def test_gemini():
    start = time.time()
    try:
        response = STAGE1_CLIENT.models.generate_content(model=STAGE1_MODEL, contents="안녕! 한 문장으로 대답해줘")
        return {"response": response.text, "latency_sec": round(time.time() - start, 3)}
    except errors.ClientError as e:
        code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        elif code == 403:
            raise HTTPException(status_code=403, detail="API 키가 유효하지 않습니다.")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test/stage1")
async def test_stage1(domain: str = "film"):
    if domain not in SAMPLES:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 도메인: '{domain}'")
    start = time.time()
    try:
        parsed = await run_stage1(domain, SAMPLES[domain])
        return {"domain": domain, "parsed": parsed, "latency_sec": round(time.time() - start, 3)}
    except errors.ClientError as e:
        code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test/stage2")
async def test_stage2():
    sample_input = {
        "analysis": {
            "emotion": "그리움", "mood": "장엄하고 고독한",
            "narrative_feature": "사랑이 시간과 공간을 초월하는 구조",
            "tags": ["우주", "고독", "초월", "부성애"],
            "connection_keyword": "시간"
        },
        "history": [],
        "exclude_domains": []
    }
    start = time.time()
    try:
        contents = [
            {"role": "user", "parts": [{"text": STAGE2_SYSTEM_PROMPT}]},
            {"role": "user", "parts": [{"text": json.dumps(sample_input, ensure_ascii=False)}]}
        ]
        response, grounding_used = call_with_grounding_fallback(contents)
        parsed = parse_llm_response(response.text)
        return {"parsed": parsed, "raw": response.text, "latency_sec": round(time.time() - start, 3), "grounding_used": grounding_used}
    except errors.ClientError as e:
        code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test/recommend/{domain}")
async def test_recommend(domain: str, exclude: str = ""):
    if domain not in ALL_DOMAINS:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 도메인: '{domain}'")

    exclude_domains = [d.strip() for d in exclude.split(",") if d.strip()] if exclude else []

    start = time.time()
    try:
        stage1_result = await run_stage1(domain, SAMPLES[domain])
        if "error" in stage1_result:
            raise HTTPException(status_code=500, detail="Stage 1 파싱 실패")

        stage2_result = await run_stage2(
            analysis=stage1_result.get("analysis", {}),
            history=[],
            exclude_domains=exclude_domains,
            exclude_title=SAMPLES[domain].get("title", ""),
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

@router.get("/test/history/two-step")
async def test_two_step_history():
    start = time.time()
    try:
        # 1단계: 영화 분석
        step1_analysis = await run_stage1("film", SAMPLES["film"])
        if "error" in step1_analysis:
            raise HTTPException(status_code=500, detail="Step 1 Stage1 파싱 실패")

        history = [
            {"domain": "film", "title": SAMPLES["film"]["title"], "analysis": step1_analysis}
        ]

        # 2단계: 도서 분석 + 1단계 히스토리 반영
        step2_analysis = await run_stage1("book", SAMPLES["book"])
        if "error" in step2_analysis:
            raise HTTPException(status_code=500, detail="Step 2 Stage1 파싱 실패")

        result = await run_stage2(
            analysis=step2_analysis,
            history=history,
            exclude_domains=["book"],
            exclude_title=SAMPLES["book"]["title"],
        )

        return {
            "latency_sec": round(time.time() - start, 3),
            "elapsed_ms": {
                "stage1_step1": step1_analysis.get("elapsed_ms"),
                "stage1_step2": step2_analysis.get("elapsed_ms"),
                "stage2": result.get("elapsed_ms"),
            },
            "history_length": len(history),
            "step1_analysis": step1_analysis,
            "step2_analysis": step2_analysis,
            "recommendations": result.get("recommendations", {}),
            "map_title": result.get("map_title"),
            "grounding_used": result.get("grounding_used"),
        }
    except errors.ClientError as e:
        code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=str(e))
        
@router.get("/test/history/three-step")
async def test_three_step_history():
    start = time.time()
    try:
        # 1단계: 영화
        step1_analysis = await run_stage1("film", SAMPLES["film"])
        if "error" in step1_analysis:
            raise HTTPException(status_code=500, detail="Step 1 Stage1 파싱 실패")

        # 2단계: 도서
        step2_analysis = await run_stage1("book", SAMPLES["book"])
        if "error" in step2_analysis:
            raise HTTPException(status_code=500, detail="Step 2 Stage1 파싱 실패")

        history = [
            {"domain": "film", "title": SAMPLES["film"]["title"], "analysis": step1_analysis},
            {"domain": "book", "title": SAMPLES["book"]["title"], "analysis": step2_analysis},
        ]

        # 3단계: 음악 + 누적 히스토리 반영
        step3_analysis = await run_stage1("music", SAMPLES["music"])
        if "error" in step3_analysis:
            raise HTTPException(status_code=500, detail="Step 3 Stage1 파싱 실패")

        result = await run_stage2(
            analysis=step3_analysis,
            history=history,
            exclude_domains=["music"],
            exclude_title=SAMPLES["music"]["title"],
        )

        return {
            "latency_sec": round(time.time() - start, 3),
            "elapsed_ms": {
                "stage1_step1": step1_analysis.get("elapsed_ms"),
                "stage1_step2": step2_analysis.get("elapsed_ms"),
                "stage2": result.get("elapsed_ms"),
            },
            "history_length": len(history),
            "step1_analysis": step1_analysis,
            "step2_analysis": step2_analysis,
            "recommendations": result.get("recommendations", {}),
            "map_title": result.get("map_title"),
            "grounding_used": result.get("grounding_used"),
        }
    except errors.ClientError as e:
        code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test-grounding")
async def test_grounding(title: str = "2026년 개봉 예정인 한국 영화"):
    start_time = time.time()
    system = (
        "너는 콘텐츠 실존 여부만 판단하는 검증기다. "
        "반드시 아래 JSON 형식으로만 응답하라. 다른 문장 일절 금지.\n"
        '존재하면: {"exists": true, "title": "", "genre": "", "year": "", "creator": ""}\n'
        '존재하지 않거나 확실하지 않으면: {"exists": false}'
    )
    try:
        response = STAGE2_CLIENT.models.generate_content(
            model=STAGE2_MODEL, contents=f"'{title}'",
            config=types.GenerateContentConfig(system_instruction=system, tools=[GOOGLE_SEARCH_TOOL])
        )
        latency = round(time.time() - start_time, 2)
        grounding_metadata = response.candidates[0].grounding_metadata if response.candidates else None
        sources = "No source"
        if grounding_metadata and hasattr(grounding_metadata, "search_entry_point"):
            ep = grounding_metadata.search_entry_point
            if ep and hasattr(ep, "rendered_content"):
                sources = ep.rendered_content
        return {"title": title, "response": parse_llm_response(response.text), "latency_sec": latency, "has_grounding": grounding_metadata is not None, "sources": sources}
    except Exception as e:
        return {"error": str(e)}


@router.get("/test-grounding/compare")
async def compare_grounding(title: str = "모립"):
    system = (
        "너는 콘텐츠 실존 여부만 판단하는 검증기다. "
        "입력된 제목과 정확히 일치하는 콘텐츠가 실제로 존재하는지만 판단하라. "
        "유사한 제목, 부분 일치, 추정은 모두 존재하지 않음으로 처리한다. "
        "반드시 아래 JSON 형식으로만 응답하라. 다른 문장 일절 금지.\n"
        '정확히 일치하면: {"exists": true, "title": "", "genre": "", "year": "", "creator": ""}\n'
        '존재하지 않거나 확실하지 않거나 유사 제목이면: {"exists": false}'
    )
    results = {}
    try:
        res_plain = STAGE2_CLIENT.models.generate_content(
            model=STAGE2_MODEL, contents=f"'{title}'",
            config=types.GenerateContentConfig(system_instruction=system)
        )
        results["without_grounding"] = parse_llm_response(res_plain.text)
    except Exception as e:
        results["without_grounding"] = f"오류: {str(e)}"

    time.sleep(1)

    try:
        res_grounded = STAGE2_CLIENT.models.generate_content(
            model=STAGE2_MODEL, contents=f"'{title}'",
            config=types.GenerateContentConfig(system_instruction=system, tools=[GOOGLE_SEARCH_TOOL])
        )
        results["with_grounding"] = parse_llm_response(res_grounded.text)
    except Exception as e:
        results["with_grounding"] = f"오류: {str(e)}"

    return {"title": title, **results}