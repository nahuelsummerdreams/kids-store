"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Item = { id: string; sku: string; size: string; color: string | null; price: number; stock: number; products: { name: string } | null };
type Line = { item: Item; qty: number };
type Pay = { method: string; amount: string };

const METHODS: [string, string][] = [
  ["cash", "Efectivo"], ["transfer", "Transferencia"], ["debit", "Débito"],
  ["credit", "Crédito"], ["mercado_pago", "Mercado Pago"], ["other", "Otro"],
];
const money = (n: number) => `$ ${n.toLocaleString("es-AR")}`;
const label = (i: Item) => `${i.products?.name} · ${i.size}${i.color ? ` ${i.color}` : ""}`;
const field = "rounded-2xl border border-navy/15 px-3 py-2 text-sm outline-none focus:border-navy";

export default function Ventas() {
  const [items, setItems] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [pays, setPays] = useState<Pay[]>([{ method: "cash", amount: "" }]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data, error } = await createClient().from("variants")
        .select("id,sku,size,color,price,stock,products(name)").gt("stock", 0).order("sku").returns<Item[]>();
      if (ignore) return;
      if (error) setMsg({ ok: false, text: error.message });
      else setItems(data);
    })();
    return () => { ignore = true; };
  }, [tick]);

  const subtotal = cart.reduce((s, l) => s + Number(l.item.price) * l.qty, 0);
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const total = subtotal - disc;
  const amountOf = (p: Pay) => (pays.length === 1 ? total : Number(p.amount) || 0);
  const paid = pays.reduce((s, p) => s + amountOf(p), 0);
  const remaining = total - paid;

  const add = (item: Item) => {
    setMsg(null);
    setCart((c) => {
      const ex = c.find((l) => l.item.id === item.id);
      if (!ex) return [...c, { item, qty: 1 }];
      return c.map((l) => (l.item.id === item.id ? { ...l, qty: Math.min(l.qty + 1, item.stock) } : l));
    });
  };
  const setQty = (id: string, qty: number) =>
    setCart((c) => c.flatMap((l) => (l.item.id !== id ? [l] : qty <= 0 ? [] : [{ ...l, qty: Math.min(qty, l.item.stock) }])));

  async function confirm() {
    setBusy(true); setMsg(null);
    const { error } = await createClient().rpc("create_sale", {
      p_discount: disc,
      p_items: cart.map((l) => ({ variant_id: l.item.id, quantity: l.qty })),
      p_payments: pays.map((p) => ({ method: p.method, amount: amountOf(p) })).filter((p) => p.amount > 0),
    });
    setBusy(false);
    if (error) {
      const noStock = error.message.includes("variants_stock_non_negative");
      reload();
      return setMsg({ ok: false, text: noStock ? "Alguno de los productos ya no tiene stock suficiente. Revisá el carrito." : error.message });
    }
    setMsg({ ok: true, text: `Venta registrada por ${money(total)}.` });
    setCart([]); setDiscount(""); setPays([{ method: "cash", amount: "" }]); reload();
  }

  const term = q.trim().toLowerCase();
  const shown = items.filter((i) => !term || `${label(i)} ${i.sku}`.toLowerCase().includes(term)).slice(0, 40);
  const canConfirm = cart.length > 0 && Math.abs(remaining) < 0.005 && !busy;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Ventas</h1>
        <p className="mt-1 text-sm text-navy/60">Al confirmar, el stock se descuenta solo.</p>
      </header>
      {msg && <p className={`rounded-2xl p-3 text-sm ${msg.ok ? "bg-mint" : "bg-blush"}`}>{msg.text}</p>}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-3 lg:col-span-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto, talle, color o SKU…" className={`${field} w-full`} />
          <div className="grid gap-2 sm:grid-cols-2">
            {shown.length === 0 && <p className="text-sm text-navy/60">No hay productos con stock.</p>}
            {shown.map((i) => (
              <button key={i.id} onClick={() => add(i)} className="rounded-3xl bg-white p-4 text-left shadow-sm transition hover:bg-sky/40">
                <p className="text-sm font-medium">{label(i)}</p>
                <p className="mt-1 text-sm">{money(Number(i.price))} <span className="text-navy/50">· {i.stock} disp.</span></p>
              </button>
            ))}
          </div>
        </div>

        <aside className="space-y-4 rounded-3xl bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="font-medium">Carrito</h2>
          {cart.length === 0 && <p className="text-sm text-navy/60">Tocá un producto para agregarlo.</p>}
          {cart.map((l) => (
            <div key={l.item.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex-1">{label(l.item)}<br /><span className="text-navy/50">{money(Number(l.item.price))} c/u</span></span>
              <button onClick={() => setQty(l.item.id, l.qty - 1)} className="h-8 w-8 rounded-full bg-sky">−</button>
              <span className="w-6 text-center">{l.qty}</span>
              <button onClick={() => setQty(l.item.id, l.qty + 1)} disabled={l.qty >= l.item.stock} className="h-8 w-8 rounded-full bg-sky disabled:opacity-40">+</button>
            </div>
          ))}

          {cart.length > 0 && (
            <>
              <input inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Descuento ($)" className={`${field} w-full`} />
              <div className="space-y-2 border-t border-navy/10 pt-3 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>{money(subtotal)}</span></div>
                {disc > 0 && <div className="flex justify-between"><span>Descuento</span><span>− {money(disc)}</span></div>}
                <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{money(total)}</span></div>
              </div>

              <div className="space-y-2 border-t border-navy/10 pt-3">
                <p className="text-sm font-medium">Pago</p>
                {pays.map((p, idx) => (
                  <div key={idx} className="flex gap-2">
                    <select value={p.method} onChange={(e) => setPays(pays.map((x, j) => (j === idx ? { ...x, method: e.target.value } : x)))} className={`${field} flex-1`}>
                      {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    {pays.length > 1 && (
                      <>
                        <input inputMode="decimal" value={p.amount} placeholder="Monto"
                          onChange={(e) => setPays(pays.map((x, j) => (j === idx ? { ...x, amount: e.target.value } : x)))} className={`${field} w-28`} />
                        <button onClick={() => setPays(pays.filter((_, j) => j !== idx))} className="px-2 text-navy/50">✕</button>
                      </>
                    )}
                  </div>
                ))}
                <button onClick={() => setPays([...pays, { method: "transfer", amount: "" }])} className="text-sm text-navy/70 underline">
                  + Combinar medios de pago
                </button>
                {pays.length > 1 && (
                  <p className={`text-sm ${Math.abs(remaining) < 0.005 ? "text-emerald-700" : "text-rose-600"}`}>
                    {Math.abs(remaining) < 0.005 ? "Pagos completos" : remaining > 0 ? `Falta cobrar ${money(remaining)}` : `Te pasaste ${money(-remaining)}`}
                  </p>
                )}
              </div>

              <button onClick={confirm} disabled={!canConfirm} className="w-full rounded-2xl bg-navy py-3 text-sm font-medium text-white disabled:opacity-50">
                {busy ? "Registrando…" : `Confirmar venta · ${money(total)}`}
              </button>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
