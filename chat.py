from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=20000)


class ChatRequest(BaseModel):
    # Full message history for this turn. The backend does not persist
    # anything yet in this slice — see README for what's still stubbed.
    messages: list[ChatMessage] = Field(min_length=1)
    model: str | None = None
    conversation_id: str | None = None
