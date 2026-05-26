from dotenv import load_dotenv
from google import genai
from google.genai import types
import os

load_dotenv()

# Stage 1 클라이언트: 맥락 분석용 (Flash-Lite, 무료 티어)
STAGE1_CLIENT = genai.Client(api_key=os.getenv("GEMINI_API_KEY_STAGE1"))
STAGE1_MODEL = "gemini-2.5-flash-lite"

# Stage 2 클라이언트: 추천 생성 + Search Grounding (별도 계정)
STAGE2_CLIENT = genai.Client(api_key=os.getenv("GEMINI_API_KEY_STAGE2"))
STAGE2_MODEL = "gemini-2.5-flash"

GOOGLE_SEARCH_TOOL = types.Tool(google_search=types.GoogleSearch())
ALL_DOMAINS = {"film", "book", "music"}

MAX_HISTORY_ITEMS = 8