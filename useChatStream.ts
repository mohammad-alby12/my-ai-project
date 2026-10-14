import { useRef, useState } from "react";
import type { ChatMessage } from "../types/chat";

interface StreamHandlers {
  onMeta?: (conversationId: string) => void;
  onToken: (text: string) => void;
  onDone: (stopped: boolean) => void;
  onError: (message: string) => void;
}

export function useChatStream(apiBase: string) {
  const [isStreaming, setIsStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  async function send(
    messages: ChatMessage[],
    accessToken: string,
    conversationId: string | null,
    handlers: StreamHandlers
  ) {
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsStreaming(true);

    try {
      const res = await fetch(`${apiBase}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: messages.map(({ role, content }) => ({ role, content })),
          conversation_id: conversationId,
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        handlers.onError(text || `Permintaan gagal (status ${res.status})`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const raw of events) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;

          let event: {
            type: string;
            content?: string;
            message?: string;
            stopped?: boolean;
            conversation_id?: string;
          };
          try {
            event = JSON.parse(line.slice("data:".length).trim());
          } catch {
            continue;
          }

          if (event.type === "meta" && event.conversation_id) handlers.onMeta?.(event.conversation_id);
          else if (event.type === "token" && event.content) handlers.onToken(event.content);
          else if (event.type === "done") handlers.onDone(Boolean(event.stopped));
          else if (event.type === "error") handlers.onError(event.message ?? "Terjadi kesalahan");
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        handlers.onDone(true);
      } else {
        handlers.onError(err instanceof Error ? err.message : "Koneksi ke backend gagal");
      }
    } finally {
      setIsStreaming(false);
      controllerRef.current = null;
    }
  }

  function stop() {
    controllerRef.current?.abort();
  }

  return { send, stop, isStreaming };
}
