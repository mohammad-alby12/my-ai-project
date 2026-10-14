from pydantic import BaseModel


class ConversationOut(BaseModel):
    id: str
    title: str | None = None
    created_at: str


class MessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: str
