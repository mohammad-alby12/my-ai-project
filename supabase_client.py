from supabase import Client, create_client

from app.core.config import get_settings


def get_anon_client() -> Client:
    """
    A client authenticated as nobody — only used to validate a user's JWT
    via /auth/v1/user. Never used for reading/writing table data (that
    would bypass the per-user RLS policies).
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


def get_user_scoped_client(access_token: str) -> Client:
    """
    A client that sends the caller's own JWT on every PostgREST request,
    so Supabase's Row Level Security policies apply as that user. The
    backend never uses a service-role key to read/write chat data —
    isolation is enforced by Postgres, not by backend logic.
    """
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    client.postgrest.auth(access_token)
    return client
