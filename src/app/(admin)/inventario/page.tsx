"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";

type Row = { id: string; sku: string; size: string; color: string | null; stock: number; min_stock: number; products: { name: string } | null };
type Move = { id: string; delta: number; reason: string; note: string | null; created_at: string; variants: { sku: string; size: string; color: string | null; products: { name: string } | null } | null };
type Kind = "in" | "out" | "count";

const REASON: Record<string, string> = {
  purchase: "Ingreso", sale: "Venta", return: "Devolución", adjustment: "Ajuste", transfer_in: "Transferencia +", transfer_out: "Transferencia −",
};
const label = (r: { size: string; color: string | null }) => `${r.size}${r.color ? ` ${r.color}` : ""}`;
const field = "rounded-2xl border border-navy/15 px-3 py-2 text-sm outline-none focus:border-navy";

export default function Inventario() {
  const [rows, setRows] = useState<Row[]>([]);
  const [moves, setMoves] = useState<Move[]>([]);
  const [q, setQ] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("in");
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const s = createClient();
      const [v, m] = await Promise.all([
        s.from("variants").select("id,sku,size,color,stock,min_stock,products(name)").order("sku").returns<Row[]>(),
        s.from("stock_movements").select("id,delta,reason,note,created_at,variants(sku,size,color,products(name))")
          .order("created_at", { ascending: false }).limit(30).returns<Move[]>(),
      ]);
      if (ignore) return;
      if (v.error || m.error) return setError((v.error ?? m.error)!.message);
      setRows(v.data); setMoves(m.data);
    })();
    return () => { ignore = true; };
  }, [tick]);

  async function submit(r: Row) {
    setError(null);
    const n = Number(qty);
    if (!Number.isInteger(n) || n < 0 || qty === "") return setError("Ingresá una cantidad entera (0 o más).");
    const delta = kind === "in" ? n : kind === "out" ? -n : n - r.stock;
    if (delta === 0) return setError("Eso no cambia el stock.");
    if (r.stock + delta < 0) return setError(`No hay stock suficiente (disponible: ${r.stock}).`);
    const { error } = await createClient().from("stock_movements").insert({
      tenant_id: await getTenantId(), variant_id: r.id, delta,
      reason: kind === "in" ? "purchase" : "adjustment",
      note: note.trim() || (kind === "count" ? "Recuento físico" : kind === "out" ? "Egreso" : null),
    });
    if (error) return setError(error.message);
    setOpen(null); setQty(""); setNote(""); reload();
  }

  const term = q.trim().toLowerCase();
  const shown = rows.filter((r) =>
    (!onlyLow || r.stock <= r.min_stock) &&
    (!term || `${r.products?.name ?? ""} ${r.sku} ${label(r)}`.toLowerCase().includes(term)));
  const lowCount = rows.filter((r) => r.stock <= r.min_stock).length;

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Inventario</h1>
        <p className="mt-1 text-sm text-navy/60">{rows.length} variantes · {lowCount} con stock bajo</p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto, SKU, talle…" className={`${field} w-full sm:w-80`} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} /> Solo stock bajo
        </label>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="divide-y divide-navy/10 rounded-3xl bg-white shadow-sm">
        {shown.length === 0 && <p className="p-5 text-sm text-navy/60">No hay variantes para mostrar.</p>}
        {shown.map((r) => (
          <div key={r.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">{r.products?.name} <span className="font-normal text-navy/60">· {label(r)}</span></p>
                <p className="text-xs text-navy/50">{r.sku}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-sm ${r.stock === 0 ? "bg-rose-200" : r.stock <= r.min_stock ? "bg-blush" : "bg-mint"}`}>
                  {r.stock === 0 ? "Agotado" : `${r.stock} u.`}
                </span>
                <button onClick={() => { setOpen(open === r.id ? null : r.id); setError(null); setQty(""); setKind("in"); }}
                  className="rounded-2xl bg-sky px-4 py-1.5 text-sm">Mover</button>
              </div>
            </div>
            {open === r.id && (
              <div className="mt-3 flex flex-wrap gap-2">
                <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={field}>
                  <option value="in">Ingreso (+)</option>
                  <option value="out">Egreso (−)</option>
                  <option value="count">Recuento (stock real)</option>
                </select>
                <input inputMode="numeric" value={qty} onChange={(e) => setQty(e.target.value)}
                  placeholder={kind === "count" ? "Cantidad contada" : "Cantidad"} className={`${field} w-40`} />
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (opcional)" className={`${field} min-w-48 flex-1`} />
                <button onClick={() => submit(r)} className="rounded-2xl bg-navy px-5 py-2 text-sm text-white">Confirmar</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="font-medium">Últimos movimientos</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {moves.length === 0 && <li className="text-navy/60">Sin movimientos todavía.</li>}
          {moves.map((m) => (
            <li key={m.id} className="flex flex-wrap justify-between gap-2">
              <span>
                <span className={m.delta > 0 ? "font-medium text-emerald-700" : "font-medium text-rose-600"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</span>{" "}
                {m.variants?.products?.name} · {m.variants && label(m.variants)}
                <span className="text-navy/50"> — {REASON[m.reason]}{m.note ? `: ${m.note}` : ""}</span>
              </span>
              <span className="text-navy/50">{new Date(m.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
