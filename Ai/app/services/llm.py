 # run_stage1, run_stage2, call_with_grounding_fallback
import json
from google.genai import types
from app.config import client, MODEL, GOOGLE_SEARCH_TOOL
from app.prompts.stage1 import get_stage1_prompt
from app.prompts.stage2 import STAGE2_SYSTEM_PROMPT
from app.utils.parser import parse_llm_response


def call_with_grounding_fallback(contents: list) -> tuple[object, bool]:
    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(tools=[GOOGLE_SEARCH_TOOL])
        )
        return response, True
    except Exception:
        response = client.models.generate_content(
            model=MODEL,
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

    response = client.models.generate_content(
        model=MODEL,
        contents=user_input,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.3,
        )
    )
    return parse_llm_response(response.text)


async def run_stage2(analysis: dict, history: list, exclude_domains: list) -> dict:
    payload = json.dumps({
        "analysis": analysis,
        "history": history,
        "exclude_domains": exclude_domains,
    }, ensure_ascii=False)

    contents = [
        {"role": "user", "parts": [{"text": STAGE2_SYSTEM_PROMPT}]},
        {"role": "user", "parts": [{"text": payload}]},
    ]
    response, grounding_used = call_with_grounding_fallback(contents)
    result = parse_llm_response(response.text)

    for d in exclude_domains:
        result.get("recommendations", {}).pop(d, None)

    result["grounding_used"] = grounding_used
    return result