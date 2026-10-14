import { useState } from "react";
import type { ConversationSummary } from "../lib/api";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  loading,
  onSelect,
  onNewChat,
  onDelete,
  onSignOut,
}: SidebarProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-panel/40">
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-accent-soft"
        >
          + Percakapan baru
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {loading && <p className="px-2 py-2 text-xs text-muted">Memuat…</p>}
        {!loading && conversations.length === 0 && (
          <p className="px-2 py-2 text-xs text-muted">Belum ada percakapan.</p>
        )}

        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group mb-1 flex items-center gap-1 rounded-lg px-2 py-2 text-sm ${
              c.id === activeId ? "bg-accent-soft text-ink" : "text-muted hover:bg-black/20"
            }`}
          >
            <button
              onClick={() => onSelect(c.id)}
              className="flex-1 truncate text-left"
              title={c.title ?? "Tanpa judul"}
            >
              {c.title || "Tanpa judul"}
            </button>

            {confirmingId === c.id ? (
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => {
                    onDelete(c.id);
                    setConfirmingId(null);
                  }}
                  className="rounded bg-red-500/80 px-1.5 py-0.5 text-xs text-white"
                >
                  Hapus
                </button>
                <button
                  onClick={() => setConfirmingId(null)}
                  className="rounded border border-border px-1.5 py-0.5 text-xs"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingId(c.id)}
                className="shrink-0 text-xs opacity-0 transition-opacity group-hover:opacity-100"
              >
                Hapus
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-border p-3">
        <button onClick={onSignOut} className="w-full text-left text-xs text-muted hover:text-ink">
          Keluar
        </button>
      </div>
    </aside>
  );
}
