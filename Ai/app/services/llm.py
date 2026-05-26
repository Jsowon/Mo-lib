import json
import time
from google.genai import types
from app.config import STAGE1_CLIENT, STAGE1_MODEL, STAGE2_CLIENT, STAGE2_MODEL, GOOGLE_SEARCH_TOOL, MAX_HISTORY_ITEMS
from app.prompts.stage1 import get_stage1_prompt
from app.prompts.stage2 import STAGE2_SYSTEM_PROMPT
from app.utils.parser import parse_llm_response


def trim_history(history: list) -> list:
    """히스토리가 MAX_HISTORY_ITEMS 초과 시 트리밍. 첫 항목은 항상 보존."""
    if len(history) <= MAX_HISTORY_ITEMS:
        return history
    return [history[0]] + history[-(MAX_HISTORY_ITEMS - 1):]


def call_with_grounding_fallback(contents: list) -> tuple[object, bool]:
    try:
        response = STAGE2_CLIENT.models.generate_content(
            model=STAGE2_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(tools=[GOOGLE_SEARCH_TOOL])
        )
        return response, True
    except Exception:
        response = STAGE2_CLIENT.models.generate_content(
            model=STAGE2_MODEL,
            contents=contents
        )
        return response, False


def build_stage1_input(domain: str, metadata: dict) -> str:
    base = {"domain": domain, "title": metadata.get("title", "")}

    if domain == "film":
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


async def run_stage1(domain: str, metadata: dict) -> dict:
    system_prompt = get_stage1_prompt(domain)
    user_input = build_stage1_input(domain, metadata)

    start = time.time()
    response = STAGE1_CLIENT.models.generate_content(
        model=STAGE1_MODEL,
        contents=user_input,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.3,
        )
    )
    elapsed_ms = round((time.time() - start) * 1000)
    result = parse_llm_response(response.text)
    result["elapsed_ms"] = elapsed_ms
    return result


async def run_stage2(analysis: dict, history: list, exclude_domains: list, exclude_title: str = "") -> dict:
    trimmed_history = trim_history(history)

    payload = json.dumps({
        "analysis": analysis,
        "history": trimmed_history,
        "exclude_domains": exclude_domains,
    }, ensure_ascii=False)

    contents = [
        {"role": "user", "parts": [{"text": STAGE2_SYSTEM_PROMPT}]},
        {"role": "user", "parts": [{"text": payload}]},
    ]

    start = time.time()
    response, grounding_used = call_with_grounding_fallback(contents)
    elapsed_ms = round((time.time() - start) * 1000)

    result = parse_llm_response(response.text)

    for d in exclude_domains:
        result.get("recommendations", {}).pop(d, None)

    if exclude_title:
        for domain_items in result.get("recommendations", {}).values():
            domain_items[:] = [
                item for item in domain_items
                if item.get("title", "").strip() != exclude_title.strip()
            ]

    # map_title: history 1개 미만이면 콘텐츠 제목으로 대체 (3-3)
    if len(history) < 1:
        result["map_title"] = exclude_title or ""

    result["grounding_used"] = grounding_used
    result["elapsed_ms"] = elapsed_ms
    result["history_trimmed"] = len(history) > MAX_HISTORY_ITEMS
    return result