"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";

type Session = { id: string; opened_at: string; closed_at: string | null; opening_amount: number; counted_amount: number | null; expected_amount: number | null };
type Move = { id: string; kind: "income" | "expense" | "withdrawal"; amount: number; note: string | null; created_at: string };
type Pay = { method: string; amount: number };

const METHOD: Record<string, string> = {
  cash: "Efectivo", transfer: "Transferencia", debit: "Débito", credit: "Crédito", mercado_pago: "Mercado Pago", other: "Otro",
};
const KIND: Record<string, string> = { income: "Ingreso", expense: "Gasto", withdrawal: "Retiro" };
const money = (n: number) => `$ ${n.toLocaleString("es-AR")}`;
const when = (d: string) => new Date(d).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
const field = "rounded-2xl border border-navy/15 px-3 py-2 text-sm outline-none focus:border-navy";

export default function Caja() {
  const [open, setOpen] = useState<Session | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [pays, setPays] = useState<Pay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  const [opening, setOpening] = useState("");
  const [kind, setKind] = useState<Move["kind"]>("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [counted, setCounted] = useState("");

  useEffect(() => {
    let ignore = false;
    (async () => {
      const s = createClient();
      const { data: sessions, error: e1 } = await s.from("cash_sessions")
        .select("id,opened_at,closed_at,opening_amount,counted_amount,expected_amount")
        .order("opened_at", { ascending: false }).limit(15).returns<Session[]>();
      if (ignore) return;
      if (e1) { setError(e1.message); setLoading(false); return; }
      const cur = sessions.find((x) => !x.closed_at) ?? null;
      let m: Move[] = [], p: Pay[] = [];
      if (cur) {
        const [mv, py] = await Promise.all([
          s.from("cash_movements").select("id,kind,amount,note,created_at").eq("cash_session_id", cur.id)
            .order("created_at", { ascending: false }).returns<Move[]>(),
          s.from("payments").select("method,amount,sales!inner(cash_session_id,status)")
            .eq("sales.cash_session_id", cur.id).eq("sales.status", "completed").returns<Pay[]>(),
        ]);
        if (ignore) return;
        if (mv.error || py.error) setError((mv.error ?? py.error)!.message);
        else { m = mv.data; p = py.data; }
      }
      setOpen(cur); setHistory(sessions.filter((x) => x.closed_at)); setMoves(m); setPays(p); setLoading(false);
    })();
    return () => { ignore = true; };
  }, [tick]);

  const byMethod = pays.reduce<Record<string, number>>((a, p) => ({ ...a, [p.method]: (a[p.method] ?? 0) + Number(p.amount) }), {});
  const sumKind = (k: Move["kind"]) => moves.filter((m) => m.kind === k).reduce((s, m) => s + Number(m.amount), 0);
  const expected = open ? Number(open.opening_amount) + (byMethod.cash ?? 0) + sumKind("income") - sumKind("expense") - sumKind("withdrawal") : 0;
  const totalSales = Object.values(byMethod).reduce((s, n) => s + n, 0);

  async function openCash() {
    setError(null);
    const n = Number(opening || 0);
    if (!(n >= 0)) return setError("Monto inválido.");
    const { error } = await createClient().from("cash_sessions").insert({ tenant_id: await getTenantId(), opening_amount: n });
    if (error) return setError(error.message);
    setOpening(""); reload();
  }

  async function addMove() {
    setError(null);
    const n = Number(amount);
    if (!(n > 0)) return setError("Ingresá un monto mayor a 0.");
    if (!open) return;
    const { error } = await createClient().from("cash_movements").insert({
      tenant_id: await getTenantId(), cash_session_id: open.id, kind, amount: n, note: note.trim() || null,
    });
    if (error) return setError(error.message);
    setAmount(""); setNote(""); reload();
  }

  async function closeCash() {
    setError(null);
    const n = Number(counted);
    if (counted === "" || !(n >= 0)) return setError("Ingresá el efectivo contado.");
    if (!open) return;
    const { error } = await createClient().from("cash_sessions")
      .update({ closed_at: new Date().toISOString(), counted_amount: n, expected_amount: expected }).eq("id", open.id);
    if (error) return setError(error.message);
    setCounted(""); reload();
  }

  const diff = counted === "" ? null : Number(counted) - expected;

  if (loading) return null;
  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Caja</h1>
        <p className="mt-1 text-sm text-navy/60">{open ? `Abierta desde ${when(open.opened_at)}` : "Caja cerrada"}</p>
      </header>
      {error && <p className="rounded-2xl bg-blush p-3 text-sm">{error}</p>}

      {!open ? (
        <div className="max-w-md space-y-3 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-medium">Abrir caja</h2>
          <p className="text-sm text-navy/60">Las ventas que hagas con la caja abierta quedan asociadas a ella.</p>
          <input inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="Efectivo inicial ($)" className={`${field} w-full`} />
          <button onClick={openCash} className="rounded-2xl bg-navy px-6 py-2.5 text-sm font-medium text-white">Abrir caja</button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl bg-mint p-5"><p className="text-sm text-navy/70">Efectivo esperado</p><p className="mt-2 text-2xl font-semibold">{money(expected)}</p></div>
            <div className="rounded-3xl bg-sky p-5"><p className="text-sm text-navy/70">Ventas del turno</p><p className="mt-2 text-2xl font-semibold">{money(totalSales)}</p></div>
            <div className="rounded-3xl bg-white p-5 shadow-sm"><p className="text-sm text-navy/70">Efectivo inicial</p><p className="mt-2 text-2xl font-semibold">{money(Number(open.opening_amount))}</p></div>
            <div className="rounded-3xl bg-blush p-5"><p className="text-sm text-navy/70">Gastos y retiros</p><p className="mt-2 text-2xl font-semibold">{money(sumKind("expense") + sumKind("withdrawal"))}</p></div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4 rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="font-medium">Ventas por medio de pago</h2>
              <ul className="space-y-1 text-sm">
                {Object.keys(byMethod).length === 0 && <li className="text-navy/60">Sin ventas todavía.</li>}
                {Object.entries(byMethod).map(([m, v]) => <li key={m} className="flex justify-between"><span>{METHOD[m] ?? m}</span><span>{money(v)}</span></li>)}
              </ul>
              <h2 className="pt-2 font-medium">Movimientos manuales</h2>
              <div className="flex flex-wrap gap-2">
                <select value={kind} onChange={(e) => setKind(e.target.value as Move["kind"])} className={field}>
                  <option value="expense">Gasto</option><option value="income">Ingreso</option><option value="withdrawal">Retiro</option>
                </select>
                <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto" className={`${field} w-28`} />
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Detalle (opcional)" className={`${field} min-w-40 flex-1`} />
                <button onClick={addMove} className="rounded-2xl bg-sky px-4 py-2 text-sm">Agregar</button>
              </div>
              <ul className="space-y-1 text-sm">
                {moves.map((m) => (
                  <li key={m.id} className="flex justify-between gap-2">
                    <span><span className={m.kind === "income" ? "text-emerald-700" : "text-rose-600"}>{m.kind === "income" ? "+" : "−"}{money(Number(m.amount))}</span> {KIND[m.kind]}{m.note ? ` · ${m.note}` : ""}</span>
                    <span className="text-navy/50">{when(m.created_at)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="font-medium">Cerrar caja</h2>
              <p className="text-sm text-navy/60">Contá el efectivo que hay en la caja y escribilo. El sistema calcula la diferencia.</p>
              <input inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} placeholder="Efectivo contado ($)" className={`${field} w-full`} />
              {diff !== null && (
                <p className={`text-sm ${Math.abs(diff) < 0.005 ? "text-emerald-700" : "text-rose-600"}`}>
                  {Math.abs(diff) < 0.005 ? "La caja cierra justa." : diff > 0 ? `Sobran ${money(diff)}` : `Faltan ${money(-diff)}`}
                </p>
              )}
              <button onClick={closeCash} className="rounded-2xl bg-navy px-6 py-2.5 text-sm font-medium text-white">Cerrar caja</button>
            </div>
          </div>
        </>
      )}

      {history.length > 0 && (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-medium">Cierres anteriores</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {history.map((h) => {
              const d = Number(h.counted_amount ?? 0) - Number(h.expected_amount ?? 0);
              return (
                <li key={h.id} className="flex flex-wrap justify-between gap-2">
                  <span>{when(h.opened_at)} → {h.closed_at && when(h.closed_at)}</span>
                  <span>Contado {money(Number(h.counted_amount ?? 0))} · <span className={Math.abs(d) < 0.005 ? "text-emerald-700" : "text-rose-600"}>{Math.abs(d) < 0.005 ? "justa" : d > 0 ? `sobran ${money(d)}` : `faltan ${money(-d)}`}</span></span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
