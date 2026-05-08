import json
import time
from fastapi import APIRouter, HTTPException
from google.genai import errors, types
from app.config import client, MODEL, GOOGLE_SEARCH_TOOL
from app.prompts.stage2 import STAGE2_SYSTEM_PROMPT
from app.services.llm import run_stage1, call_with_grounding_fallback
from app.utils.parser import parse_llm_response

router = APIRouter()

STAGE1_SAMPLES = {
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
        "title": "Blinding Lights", "genre": "Synth-pop",
        "artist": "The Weeknd",
        "mood_tags": ["고에너지", "향수", "밤", "드라이브", "긴박함"],
    },
}


@router.get("/health")
def health_check():
    return {"status": "ok", "message": "Mo:lib AI server is running"}


@router.get("/test")
async def test_gemini():
    start = time.time()
    try:
        response = client.models.generate_content(model=MODEL, contents="안녕! 한 문장으로 대답해줘")
        return {"response": response.text, "latency_sec": round(time.time() - start, 3)}
    except errors.ClientError as e:
        code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        elif code == 403:
            raise HTTPException(status_code=403, detail="API 키가 유효하지 않습니다.")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test/movie")
async def test_movie():
    try:
        response = client.models.generate_content(model=MODEL, contents="인터스텔라 같은 분위기의 책을 한 권 추천해줘. 제목과 한 줄 이유만.")
        return {"response": response.text}
    except errors.ClientError as e:
        code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test/book")
async def test_book():
    try:
        response = client.models.generate_content(model=MODEL, contents="어린왕자 같은 분위기의 음악을 한 곡 추천해줘. 제목과 한 줄 이유만.")
        return {"response": response.text}
    except errors.ClientError as e:
        code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test/music")
async def test_music():
    try:
        response = client.models.generate_content(model=MODEL, contents="Bohemian Rhapsody 같은 분위기의 영화를 한 편 추천해줘. 제목과 한 줄 이유만.")
        return {"response": response.text}
    except errors.ClientError as e:
        code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test/stage1")
async def test_stage1(domain: str = "film"):
    if domain not in STAGE1_SAMPLES:
        raise HTTPException(status_code=400, detail=f"지원하지 않는 도메인: '{domain}'")
    start = time.time()
    try:
        parsed = await run_stage1(domain, STAGE1_SAMPLES[domain])
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
        response = client.models.generate_content(
            model=MODEL, contents=f"'{title}'",
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
async def compare_grounding(title: str = "아무말대잔치소설2025"):
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
        res_plain = client.models.generate_content(model=MODEL, contents=f"'{title}'", config=types.GenerateContentConfig(system_instruction=system))
        results["without_grounding"] = parse_llm_response(res_plain.text)
    except Exception as e:
        results["without_grounding"] = f"오류: {str(e)}"

    time.sleep(1)

    try:
        res_grounded = client.models.generate_content(model=MODEL, contents=f"'{title}'", config=types.GenerateContentConfig(system_instruction=system, tools=[GOOGLE_SEARCH_TOOL]))
        results["with_grounding"] = parse_llm_response(res_grounded.text)
    except Exception as e:
        results["with_grounding"] = f"오류: {str(e)}"

    return {"title": title, **results}