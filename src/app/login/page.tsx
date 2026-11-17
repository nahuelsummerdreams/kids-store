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
    <main className="grid min-h-screen md:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-navy p-12 text-white md:flex md:flex-col md:justify-between">
        <div className="pointer-events-none absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-sky/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-64 w-64 rounded-full bg-blush/25 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky text-navy"><span className="display text-xl font-bold">K</span></div>
          <p className="display text-xl font-semibold">Kids Store</p>
        </div>
        <div className="relative">
          <h2 className="display text-5xl font-semibold leading-[1.05]">Cada prenda,<br />cada talle,<br />bajo control.</h2>
          <p className="mt-5 max-w-sm text-white/65">Stock, ventas y caja de tu tienda en un solo lugar. Simple de usar desde el celular.</p>
        </div>
        <p className="relative text-xs uppercase tracking-[0.14em] text-white/40">Digital Studio</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div className="mb-6 md:hidden">
            <p className="eyebrow">Digital Studio</p>
            <p className="page-title">Kids Store</p>
          </div>
          <div className="hidden md:block">
            <h1 className="page-title">Hola 👋</h1>
            <p className="page-sub">Ingresá para ver tu negocio.</p>
          </div>
          <input type="email" required autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="field w-full" />
          <input type="password" required autoComplete="current-password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} className="field w-full" />
          {error && <p className="rounded-2xl bg-rose-50 px-4 py-2.5 text-sm text-rose-700">{error}</p>}
          <button disabled={loading} className="btn btn-primary w-full py-3">{loading ? "Ingresando…" : "Ingresar"}</button>
        </form>
      </section>
    </main>
  );
}
