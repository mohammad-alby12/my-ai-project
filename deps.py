from fastapi import Header, HTTPException
from starlette.concurrency import run_in_threadpool

from app.core.supabase_client import get_anon_client


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """
    Verifies the Authorization: Bearer <supabase_access_token> header against
    Supabase Auth. Raises 401 if missing, malformed, or the session is no
    longer valid — nothing downstream runs as an unverified user.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    client = get_anon_client()
    try:
        response = await run_in_threadpool(client.auth.get_user, token)
    except Exception as exc:  # Supabase raises on invalid/expired tokens
        raise HTTPException(status_code=401, detail="Invalid or expired session") from exc

    if not response or not response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    return {"id": response.user.id, "token": token}
