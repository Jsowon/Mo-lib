from dotenv import load_dotenv
from google import genai
from google.genai import types
import os

load_dotenv()

_CLIENT = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

STAGE1_CLIENT = _CLIENT
STAGE1_MODEL = "gemini-2.5-flash-lite"

STAGE2_CLIENT = _CLIENT
STAGE2_MODEL = "gemini-2.5-flash-lite"

GOOGLE_SEARCH_TOOL = types.Tool(google_search=types.GoogleSearch())
ALL_DOMAINS = {"film", "book", "music"}

MAX_HISTORY_ITEMS = 8