 # parse_llm_response
import json
import re


def parse_llm_response(raw: str) -> dict:
    cleaned = re.sub(r"```json|```", "", raw).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
    return {
        "error": {
            "code": "INVALID_INPUT",
            "message": "추천 결과를 불러오는 데 실패했습니다. 다시 시도해주세요."
        }
    }