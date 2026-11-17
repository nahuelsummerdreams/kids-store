"use client";

import Image from "next/image";
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
      <section className="relative hidden flex-col items-center justify-between overflow-hidden bg-coal p-12 text-white md:flex">
        <div className="drift pointer-events-none absolute -top-24 left-1/3 h-96 w-96 rounded-full bg-yolk/20 blur-3xl" />
        <div className="drift pointer-events-none absolute bottom-24 right-0 h-72 w-72 rounded-full bg-yolk/10 blur-3xl [animation-delay:-5s]" />
        <p className="eyebrow relative !text-white/40">Panel de tienda</p>
        <div className="relative text-center">
          <div className="pop"><Image src="/logo.png" alt="Toxic Kids" width={679} height={720} priority className="float mx-auto w-60 drop-shadow-[0_20px_40px_rgba(252,228,8,0.25)]" /></div>
          <h2 style={{ "--i": 3 } as React.CSSProperties} className="rise display mt-10 text-4xl font-semibold leading-[1.1]">
            Cada prenda, cada talle,<br /><span className="text-yolk">bajo control.</span>
          </h2>
        </div>
        <div className="hazard relative h-3 w-full rounded-full" />
      </section>

      <section className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="rise w-full max-w-sm space-y-4">
          <div className="mb-6 md:hidden">
            <Image src="/logo.png" alt="Toxic Kids" width={679} height={720} priority className="h-24 w-auto" />
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
