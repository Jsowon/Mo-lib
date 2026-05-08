from dotenv import load_dotenv
from google import genai
from google.genai import types
import os

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
MODEL = "gemini-2.5-flash-lite"
GOOGLE_SEARCH_TOOL = types.Tool(google_search=types.GoogleSearch())
ALL_DOMAINS = {"film", "book", "music"}