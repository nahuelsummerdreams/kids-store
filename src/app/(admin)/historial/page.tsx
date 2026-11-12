"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Sale = {
  id: string; total: number; discount: number; created_at: string;
  sale_items: { quantity: number; unit_price: number; variants: { size: string; color: string | null; products: { name: string } | null } | null }[];
  payments: { method: string; amount: number }[];
};
const METHOD: Record<string, string> = { cash: "Efectivo", transfer: "Transferencia", debit: "Débito", credit: "Crédito", mercado_pago: "Mercado Pago", other: "Otro" };
const money = (n: number) => `$ ${Number(n).toLocaleString("es-AR")}`;

export default function Historial() {
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const { data, error } = await createClient().from("sales")
        .select("id,total,discount,created_at,sale_items(quantity,unit_price,variants(size,color,products(name))),payments(method,amount)")
        .eq("status", "completed").order("created_at", { ascending: false }).limit(50).returns<Sale[]>();
      if (ignore) return;
      if (error) setError(error.message); else setSales(data);
    })();
    return () => { ignore = true; };
  }, []);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Historial de ventas</h1>
        <p className="mt-1 text-sm text-navy/60">Las últimas 50 ventas.</p>
      </header>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {sales?.length === 0 && <p className="text-sm text-navy/60">Todavía no hay ventas.</p>}
      <div className="space-y-3">
        {sales?.map((s) => (
          <article key={s.id} className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-sm text-navy/60">{new Date(s.created_at).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}</span>
              <span className="font-semibold">{money(s.total)}</span>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {s.sale_items.map((i, k) => (
                <li key={k}>{i.quantity} × {i.variants?.products?.name} · {i.variants?.size}{i.variants?.color ? ` ${i.variants.color}` : ""} <span className="text-navy/50">({money(i.unit_price)} c/u)</span></li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-navy/60">
              {s.payments.map((p) => `${METHOD[p.method] ?? p.method} ${money(p.amount)}`).join(" · ")}
              {Number(s.discount) > 0 ? ` · Descuento ${money(s.discount)}` : ""}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
