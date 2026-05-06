from fastapi import FastAPI, HTTPException
from dotenv import load_dotenv
from google import genai
from google.genai import errors
import os
import time

load_dotenv()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

app = FastAPI(title="Mo:lib AI Server")

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Mo:lib AI server is running"}

@app.get("/test")
async def test_gemini():
    start = time.time()
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents="안녕! 한 문장으로 대답해줘"
        )
        elapsed = round(time.time() - start, 3)
        return {"response": response.text, "latency_sec": elapsed}
    except errors.ClientError as e:
        if e.status_code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        elif e.status_code == 403:
            raise HTTPException(status_code=403, detail="API 키가 유효하지 않습니다.")
        else:
            raise HTTPException(status_code=500, detail=f"Gemini API 오류: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

@app.get("/test/movie")
async def test_movie():
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents="인터스텔라 같은 분위기의 책을 한 권 추천해줘. 제목과 한 줄 이유만."
        )
        return {"response": response.text}
    except errors.ClientError as e:
        if e.status_code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test/book")
async def test_book():
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents="어린왕자 같은 분위기의 음악을 한 곡 추천해줘. 제목과 한 줄 이유만."
        )
        return {"response": response.text}
    except errors.ClientError as e:
        if e.status_code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test/music")
async def test_music():
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents="Bohemian Rhapsody 같은 분위기의 영화를 한 편 추천해줘. 제목과 한 줄 이유만."
        )
        return {"response": response.text}
    except errors.ClientError as e:
        if e.status_code == 429:
            raise HTTPException(status_code=429, detail="API 할당량 초과. 잠시 후 다시 시도해주세요.")
        raise HTTPException(status_code=500, detail=str(e))