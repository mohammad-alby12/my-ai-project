import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import type { ChatMessage } from "../types/chat";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`group relative max-w-[42rem] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-accent-soft border border-accent/30 text-ink"
            : "bg-panel/60 border border-border backdrop-blur-sm text-ink"
        }`}
      >
        {message.status === "error" ? (
          <p className="text-sm text-red-300">{message.content}</p>
        ) : (
          <div className="prose-chat">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {message.content || (message.streaming ? "…" : "")}
            </ReactMarkdown>
          </div>
        )}

        {message.status === "stopped" && (
          <p className="mt-1 text-xs text-muted">Dihentikan.</p>
        )}

        {!message.streaming && message.content && (
          <button
            onClick={handleCopy}
            className="absolute -bottom-3 right-3 rounded-md border border-border bg-panel px-2 py-0.5 text-xs text-muted opacity-0 transition-opacity hover:text-ink group-hover:opacity-100"
          >
            {copied ? "Disalin" : "Salin"}
          </button>
        )}
      </div>
    </div>
  );
}
