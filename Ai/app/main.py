from fastapi import FastAPI
from app.routers import test

app = FastAPI(title="Mo:lib AI Server")

app.include_router(test.router)