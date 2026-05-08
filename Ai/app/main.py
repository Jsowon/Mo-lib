from fastapi import FastAPI
from app.routers import test, recommend

app = FastAPI(title="Mo:lib AI Server")

app.include_router(test.router)
app.include_router(recommend.router)