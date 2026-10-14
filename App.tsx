import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { AuthScreen } from "./components/AuthScreen";
import { Composer } from "./components/Composer";
import { MessageList } from "./components/MessageList";
import { Sidebar } from "./components/Sidebar";
import { useChatStream } from "./hooks/useChatStream";
import { supabase } from "./lib/supabaseClient";
import {
  deleteConversation,
  fetchConversations,
  fetchMessages,
  type ConversationSummary,
} from "./lib/api";
import type { ChatMessage } from "./types/chat";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
const MODEL_LABEL = import.meta.env.VITE_MODEL_LABEL ?? "model belum dikonfigurasi";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const { send, stop, isStreaming } = useChatStream(API_BASE);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) refreshConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function refreshConversations() {
    if (!session) return;
    setConversationsLoading(true);
    try {
      const list = await fetchConversations(session.access_token);
      setConversations(list);
    } catch {
      // Riwayat gagal dimuat — percakapan baru tetap bisa dibuat, jadi
      // ini tidak diperlakukan sebagai error yang memblokir.
    } finally {
      setConversationsLoading(false);
    }
  }

  async function handleSelectConversation(id: string) {
    if (!session || isStreaming) return;
    setActiveConversationId(id);
    try {
      const rows = await fetchMessages(session.access_token, id);
      setMessages(
        rows
          .filter((r) => r.role !== "system")
          .map((r) => ({ id: r.id, role: r.role, content: r.content }))
      );
    } catch (err) {
      setMessages([
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err instanceof Error ? err.message : "Gagal memuat percakapan.",
          status: "error",
        },
      ]);
    }
  }

  function handleNewChat() {
    if (isStreaming) return;
    setActiveConversationId(null);
    setMessages([]);
  }

  async function handleDeleteConversation(id: string) {
    if (!session) return;
    try {
      await deleteConversation(session.access_token, id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    } catch {
      // Diamkan di UI riwayat; aksi bisa dicoba lagi oleh pengguna.
    }
  }

  function updateLastAssistant(patch: Partial<ChatMessage>) {
    setMessages((prev) => {
      const next = [...prev];
      const lastIndex = next.length - 1;
      next[lastIndex] = { ...next[lastIndex], ...patch };
      return next;
    });
  }

  async function handleSend(text: string) {
    if (!session) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      streaming: true,
    };
    const history = [...messages, userMessage];
    setMessages([...history, assistantMessage]);

    let conversationIdForThisTurn = activeConversationId;

    await send(history, session.access_token, activeConversationId, {
      onMeta: (conversationId) => {
        conversationIdForThisTurn = conversationId;
        if (!activeConversationId) setActiveConversationId(conversationId);
      },
      onToken: (token) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + token };
          return next;
        });
      },
      onDone: (stopped) => {
        updateLastAssistant({ streaming: false, status: stopped ? "stopped" : "ok" });
        if (conversationIdForThisTurn && !conversations.some((c) => c.id === conversationIdForThisTurn)) {
          refreshConversations();
        }
      },
      onError: (message) => {
        updateLastAssistant({ streaming: false, status: "error", content: message });
      },
    });
  }

  if (!sessionLoaded) {
    return <div className="flex h-screen items-center justify-center text-muted">Memuat…</div>;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        loading={conversationsLoading}
        onSelect={handleSelectConversation}
        onNewChat={handleNewChat}
        onDelete={handleDeleteConversation}
        onSignOut={() => supabase.auth.signOut()}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-8">
          <span className="font-semibold tracking-tight text-ink">FARXZZ AI</span>
          <span className="text-xs text-muted">{MODEL_LABEL}</span>
        </header>

        <main className="min-h-0 flex-1">
          <MessageList messages={messages} />
        </main>

        <Composer isStreaming={isStreaming} onSend={handleSend} onStop={stop} />
      </div>
    </div>
  );
}
