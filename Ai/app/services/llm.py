import json
import time
import asyncio
from google.genai import types
from app.config import STAGE1_CLIENT, STAGE1_MODEL, STAGE2_CLIENT, STAGE2_MODEL, GOOGLE_SEARCH_TOOL, MAX_HISTORY_ITEMS
from app.prompts.stage1 import get_stage1_prompt
from app.prompts.stage2 import STAGE2_SYSTEM_PROMPT
from app.utils.parser import parse_llm_response

STAGE1_TIMEOUT = 10
STAGE2_TIMEOUT = 60
MAX_RETRIES = 2


def trim_history(history: list) -> list:
    if len(history) <= MAX_HISTORY_ITEMS:
        return history
    return [history[0]] + history[-(MAX_HISTORY_ITEMS - 1):]


def call_with_grounding_fallback(contents: list) -> tuple[object, bool]:
    config_with = types.GenerateContentConfig(
        tools=[GOOGLE_SEARCH_TOOL],
        system_instruction=STAGE2_SYSTEM_PROMPT,
        temperature=0.3,
    )
    config_without = types.GenerateContentConfig(
        system_instruction=STAGE2_SYSTEM_PROMPT,
        temperature=0.3,
    )
    try:
        response = STAGE2_CLIENT.models.generate_content(
            model=STAGE2_MODEL,
            contents=contents,
            config=config_with,
        )
        return response, True
    except Exception:
        response = STAGE2_CLIENT.models.generate_content(
            model=STAGE2_MODEL,
            contents=contents,
            config=config_without,
        )
        return response, False


def build_stage1_input(domain: str, metadata: dict) -> str:
    base = {"domain": domain, "title": metadata.get("title", "")}

    if domain == "movie":
        base.update({
            "genre": metadata.get("genre", ""),
            "synopsis": metadata.get("synopsis", ""),
            "director": metadata.get("director", ""),
            "year": metadata.get("year", ""),
        })
    elif domain == "book":
        base.update({
            "genre": metadata.get("genre", ""),
            "description": metadata.get("description", ""),
            "author": metadata.get("author", ""),
        })
    elif domain == "music":
        base.update({
            "genre": metadata.get("genre", ""),
            "artist": metadata.get("artist", ""),
            "mood_tags": metadata.get("mood_tags", []),
        })
    else:
        raise ValueError(f"지원하지 않는 도메인: '{domain}'")

    return json.dumps(base, ensure_ascii=False)


async def _call_stage1(system_prompt: str, user_input: str) -> object:
    loop = asyncio.get_event_loop()
    return await asyncio.wait_for(
        loop.run_in_executor(
            None,
            lambda: STAGE1_CLIENT.models.generate_content(
                model=STAGE1_MODEL,
                contents=user_input,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=0.3,
                )
            )
        ),
        timeout=STAGE1_TIMEOUT,
    )


async def _call_stage2(contents: list) -> tuple[object, bool]:
    loop = asyncio.get_event_loop()
    return await asyncio.wait_for(
        loop.run_in_executor(None, lambda: call_with_grounding_fallback(contents)),
        timeout=STAGE2_TIMEOUT,
    )


async def run_stage1(domain: str, metadata: dict) -> dict:
    system_prompt = get_stage1_prompt(domain)
    user_input = build_stage1_input(domain, metadata)

    for attempt in range(MAX_RETRIES):
        try:
            start = time.time()
            response = await _call_stage1(system_prompt, user_input)
            elapsed_ms = round((time.time() - start) * 1000)
            result = parse_llm_response(response.text)

            if "error" in result:
                return {
                    "error": {
                        "code": "UNKNOWN_CONTENT",
                        "message": "입력하신 콘텐츠를 분석할 수 없습니다. 제목과 정보를 확인 후 다시 시도해주세요."
                    },
                    "elapsed_ms": elapsed_ms,
                }

            analysis = result.get("analysis", {})
            if not analysis.get("emotion") and not analysis.get("mood") and not analysis.get("tags"):
                return {
                    "error": {
                        "code": "UNKNOWN_CONTENT",
                        "message": "입력하신 콘텐츠를 분석할 수 없습니다. 제목과 정보를 확인 후 다시 시도해주세요."
                    },
                    "elapsed_ms": elapsed_ms,
                }

            result["elapsed_ms"] = elapsed_ms
            return result

        except asyncio.TimeoutError:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)
        except Exception as e:
            raise e

    return {
        "error": {
            "code": "TIMEOUT",
            "message": "분석 요청 시간이 초과되었습니다. 다시 시도해주세요."
        },
        "elapsed_ms": STAGE1_TIMEOUT * 1000,
    }


async def run_stage2(analysis: dict, history: list, exclude_domains: list, exclude_title: str = "", input_domain: str = "") -> dict:
    trimmed_history = trim_history(history)

    payload = json.dumps({
        "analysis": analysis,
        "history": trimmed_history,
        "exclude_domains": exclude_domains,
        "exclude_title": exclude_title,
        "input_domain": input_domain,
    }, ensure_ascii=False)

    contents = [{"role": "user", "parts": [{"text": payload}]}]

    for attempt in range(MAX_RETRIES):
        try:
            start = time.time()
            response, grounding_used = await _call_stage2(contents)
            elapsed_ms = round((time.time() - start) * 1000)

            result = parse_llm_response(response.text)

            for d in exclude_domains:
                result.get("recommendations", {}).pop(d, None)
            result["recommendations"] = {
                k: v for k, v in result.get("recommendations", {}).items() if v
            }

            recs = result.get("recommendations", {})
            total_count = sum(len(v) for v in recs.values())
            if total_count == 0 and exclude_domains and attempt < MAX_RETRIES - 1:
                payload = json.dumps({
                    "analysis": analysis,
                    "history": trimmed_history,
                    "exclude_domains": [],
                }, ensure_ascii=False)
                contents = [{"role": "user", "parts": [{"text": payload}]}]
                await asyncio.sleep(1)
                continue

            if len(history) < 1:
                result["map_title"] = exclude_title or ""

            result["grounding_used"] = grounding_used
            result["elapsed_ms"] = elapsed_ms
            result["history_trimmed"] = len(history) > MAX_HISTORY_ITEMS
            result["domain_filter_relaxed"] = (attempt > 0)
            return result

        except asyncio.TimeoutError:
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(1)
        except Exception as e:
            raise e

    return {
        "error": {
            "code": "TIMEOUT",
            "message": "추천 요청 시간이 초과되었습니다. 다시 시도해주세요."
        },
        "elapsed_ms": STAGE2_TIMEOUT * 1000,
        "grounding_used": False,
        "history_trimmed": False,
    }