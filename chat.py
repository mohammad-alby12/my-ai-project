import json

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings, get_settings
from app.core.deps import get_current_user
from app.core.supabase_client import get_user_scoped_client
from app.providers.base import ProviderError
from app.providers.openai_compatible import OpenAICompatibleProvider
from app.schemas.chat import ChatRequest

router = APIRouter(prefix="/api/chat", tags=["chat"])


def get_provider(settings: Settings = Depends(get_settings)) -> OpenAICompatibleProvider:
    if not settings.provider_api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "No AI provider is configured. Set PROVIDER_API_KEY in your "
                "backend .env file."
            ),
        )
    return OpenAICompatibleProvider(
        base_url=settings.provider_base_url,
        api_key=settings.provider_api_key,
        default_model=settings.provider_model,
    )


def _sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@router.post("/stream")
async def stream_chat(
    request: Request,
    payload: ChatRequest,
    settings: Settings = Depends(get_settings),
    provider: OpenAICompatibleProvider = Depends(get_provider),
    user: dict = Depends(get_current_user),
):
    last_user = next(
        (m for m in reversed(payload.messages) if m.role == "user"), None
    )
    if last_user is None:
        raise HTTPException(status_code=400, detail="No user message found in the request.")
    if len(last_user.content) > settings.max_message_chars:
        raise HTTPException(
            status_code=413,
            detail=f"Message exceeds {settings.max_message_chars} characters.",
        )

    db = get_user_scoped_client(user["token"])

    conversation_id = payload.conversation_id
    if not conversation_id:
        title = last_user.content.strip()[:60] or "New Chat"

        def _create_conversation():
            return db.table("conversations").insert({"title": title}).execute()

        created = await run_in_threadpool(_create_conversation)
        conversation_id = created.data[0]["id"]

    def _insert_user_message():
        return (
            db.table("messages")
            .insert(
                {
                    "conversation_id": conversation_id,
                    "role": "user",
                    "content": last_user.content,
                }
            )
            .execute()
        )

    await run_in_threadpool(_insert_user_message)

    def _insert_assistant_message(content: str):
        return (
            db.table("messages")
            .insert(
                {
                    "conversation_id": conversation_id,
                    "role": "assistant",
                    "content": content,
                }
            )
            .execute()
        )

    async def event_generator():
        collected = ""
        yield _sse({"type": "meta", "conversation_id": conversation_id})
        try:
            async for token in provider.stream(payload.messages, model=payload.model):
                if await request.is_disconnected():
                    break
                collected += token
                yield _sse({"type": "token", "content": token})
            else:
                if collected:
                    await run_in_threadpool(_insert_assistant_message, collected)
                yield _sse({"type": "done"})
                return

            if collected:
                await run_in_threadpool(_insert_assistant_message, collected)
            yield _sse({"type": "done", "stopped": True})
        except ProviderError as exc:
            # Not persisted: we only save turns that actually completed,
            # so a failed generation doesn't leave a fake assistant reply.
            yield _sse({"type": "error", "message": str(exc)})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
