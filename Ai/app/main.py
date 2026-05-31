from fastapi import FastAPI
import os

app = FastAPI(title="Mo:lib AI Server")

if os.getenv("ENV") != "production":
    from app.routers import test
    app.include_router(test.router)