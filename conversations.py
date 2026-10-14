from fastapi import APIRouter, Depends
from starlette.concurrency import run_in_threadpool

from app.core.deps import get_current_user
from app.core.supabase_client import get_user_scoped_client
from app.schemas.conversation import ConversationOut, MessageOut

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationOut])
async def list_conversations(user: dict = Depends(get_current_user)):
    db = get_user_scoped_client(user["token"])

    def _query():
        return (
            db.table("conversations")
            .select("id,title,created_at")
            .order("created_at", desc=True)
            .execute()
        )

    result = await run_in_threadpool(_query)
    return result.data


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
async def list_messages(conversation_id: str, user: dict = Depends(get_current_user)):
    db = get_user_scoped_client(user["token"])

    def _query():
        return (
            db.table("messages")
            .select("id,role,content,created_at")
            .eq("conversation_id", conversation_id)
            .order("created_at")
            .execute()
        )

    result = await run_in_threadpool(_query)
    # RLS returns an empty list (not an error) for a conversation the
    # caller doesn't own — nothing extra to check here.
    return result.data


@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(conversation_id: str, user: dict = Depends(get_current_user)):
    db = get_user_scoped_client(user["token"])

    def _delete():
        return db.table("conversations").delete().eq("id", conversation_id).execute()

    await run_in_threadpool(_delete)
