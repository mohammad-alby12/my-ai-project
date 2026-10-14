from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Central app configuration. All values come from environment variables
    (see .env.example) — never hardcode secrets here.
    """

    provider_base_url: str = "https://api.openai.com/v1"
    provider_api_key: str = ""
    provider_model: str = "gpt-4o-mini"

    allowed_origins: str = "http://localhost:5173"
    max_message_chars: int = 8000

    supabase_url: str = ""
    supabase_anon_key: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
