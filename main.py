from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.chat import router as chat_router
from app.api.conversations import router as conversations_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(title="FARXZZ AI backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(conversations_router)


@app.get("/health")
async def health():
    return {"status": "ok", "provider_configured": bool(settings.provider_api_key)}
