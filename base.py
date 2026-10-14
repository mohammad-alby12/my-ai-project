from abc import ABC, abstractmethod
from collections.abc import AsyncIterator

from app.schemas.chat import ChatMessage


class ProviderError(Exception):
    """Raised when the upstream AI provider fails or times out."""


class ProviderAdapter(ABC):
    """
    Common interface every AI provider must implement. The rest of the
    backend (the chat endpoint, tool-calling layer, etc.) only ever talks
    to this interface — never to a specific provider's SDK directly.

    Capability flags (supports_vision / supports_tools) must reflect the
    REAL capability of the configured model. Callers use them to decide
    what to show in the UI; never claim a capability that isn't real.
    """

    @abstractmethod
    async def stream(
        self, messages: list[ChatMessage], *, model: str | None = None
    ) -> AsyncIterator[str]:
        """Yield response text incrementally as it's generated."""
        ...

    @abstractmethod
    async def generate(
        self, messages: list[ChatMessage], *, model: str | None = None
    ) -> str:
        """Return the full response in one call (non-streaming)."""
        ...

    def supports_vision(self) -> bool:
        return False

    def supports_tools(self) -> bool:
        return False

    async def list_models(self) -> list[str] | None:
        """Return None if the provider doesn't expose a models list."""
        return None
