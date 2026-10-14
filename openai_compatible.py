import json
from collections.abc import AsyncIterator

import httpx

from app.providers.base import ProviderAdapter, ProviderError
from app.schemas.chat import ChatMessage

REQUEST_TIMEOUT = httpx.Timeout(connect=10.0, read=60.0, write=10.0, pool=10.0)


class OpenAICompatibleProvider(ProviderAdapter):
    """
    Works with OpenAI itself and with any endpoint that mirrors its
    /chat/completions API (many local-model servers, including a
    correctly configured Ollama instance, do this).
    """

    def __init__(self, base_url: str, api_key: str, default_model: str):
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._default_model = default_model

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    def _payload(
        self, messages: list[ChatMessage], model: str | None, stream: bool
    ) -> dict:
        return {
            "model": model or self._default_model,
            "messages": [m.model_dump() for m in messages],
            "stream": stream,
        }

    async def stream(
        self, messages: list[ChatMessage], *, model: str | None = None
    ) -> AsyncIterator[str]:
        url = f"{self._base_url}/chat/completions"
        payload = self._payload(messages, model, stream=True)

        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                async with client.stream(
                    "POST", url, json=payload, headers=self._headers()
                ) as response:
                    if response.status_code != 200:
                        body = await response.aread()
                        raise ProviderError(
                            f"Provider returned {response.status_code}: "
                            f"{body.decode(errors='replace')[:500]}"
                        )

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        data = line[len("data:") :].strip()
                        if data == "[DONE]":
                            return
                        try:
                            chunk = json.loads(data)
                        except json.JSONDecodeError:
                            continue

                        delta = (
                            chunk.get("choices", [{}])[0]
                            .get("delta", {})
                            .get("content")
                        )
                        if delta:
                            yield delta
        except httpx.TimeoutException as exc:
            raise ProviderError("Provider request timed out") from exc
        except httpx.HTTPError as exc:
            raise ProviderError(f"Provider request failed: {exc}") from exc

    async def generate(
        self, messages: list[ChatMessage], *, model: str | None = None
    ) -> str:
        url = f"{self._base_url}/chat/completions"
        payload = self._payload(messages, model, stream=False)

        try:
            async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
                response = await client.post(url, json=payload, headers=self._headers())
        except httpx.TimeoutException as exc:
            raise ProviderError("Provider request timed out") from exc
        except httpx.HTTPError as exc:
            raise ProviderError(f"Provider request failed: {exc}") from exc

        if response.status_code != 200:
            raise ProviderError(
                f"Provider returned {response.status_code}: {response.text[:500]}"
            )

        data = response.json()
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            raise ProviderError("Unexpected provider response shape") from exc

    def supports_vision(self) -> bool:
        # Conservative default: flip to True only for models you've
        # actually verified accept image content blocks.
        return False

    def supports_tools(self) -> bool:
        return False
