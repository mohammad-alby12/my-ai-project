import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function AuthScreen() {
  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const { error: authError } =
      mode === "sign_in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === "sign_up") {
      setNotice("Akun dibuat. Cek email untuk verifikasi, lalu masuk.");
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-base px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-border bg-panel/60 p-6 backdrop-blur-sm"
      >
        <h1 className="mb-1 text-lg font-semibold text-ink">FARXZZ AI</h1>
        <p className="mb-6 text-sm text-muted">
          {mode === "sign_in" ? "Masuk ke akun kamu" : "Buat akun baru"}
        </p>

        <label className="mb-1 block text-xs text-muted">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-lg border border-border bg-black/30 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        />

        <label className="mb-1 block text-xs text-muted">Password</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-border bg-black/30 px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-accent"
        />

        {error && <p className="mb-3 text-sm text-red-300">{error}</p>}
        {notice && <p className="mb-3 text-sm text-emerald-300">{notice}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        >
          {loading ? "Memproses…" : mode === "sign_in" ? "Masuk" : "Daftar"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "sign_in" ? "sign_up" : "sign_in");
            setError(null);
            setNotice(null);
          }}
          className="mt-3 w-full text-center text-xs text-muted hover:text-ink"
        >
          {mode === "sign_in" ? "Belum punya akun? Daftar" : "Sudah punya akun? Masuk"}
        </button>
      </form>
    </div>
  );
}
