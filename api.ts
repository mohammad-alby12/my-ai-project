const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

export interface ConversationSummary {
  id: string;
  title: string | null;
  created_at: string;
}

export interface MessageRow {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  created_at: string;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export async function fetchConversations(token: string): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_BASE}/api/conversations`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Gagal memuat riwayat (${res.status})`);
  return res.json();
}

export async function fetchMessages(token: string, conversationId: string): Promise<MessageRow[]> {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}/messages`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Gagal memuat pesan (${res.status})`);
  return res.json();
}

export async function deleteConversation(token: string, conversationId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/conversations/${conversationId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok && res.status !== 204) throw new Error(`Gagal menghapus percakapan (${res.status})`);
}
