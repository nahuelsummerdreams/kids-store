"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError("Email o contraseña incorrectos.");
    router.replace("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-sky/40 p-5">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-white p-8 shadow-sm">
        <div>
          <p className="text-xs uppercase tracking-widest text-navy/50">Digital Studio</p>
          <h1 className="text-2xl font-semibold">Kids Store</h1>
        </div>
        <input
          type="email" required autoComplete="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl border border-navy/15 px-4 py-3 text-sm outline-none focus:border-navy"
        />
        <input
          type="password" required autoComplete="current-password" placeholder="Contraseña" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border border-navy/15 px-4 py-3 text-sm outline-none focus:border-navy"
        />
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-2xl bg-navy py-3 text-sm font-medium text-white disabled:opacity-60">
          {loading ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
