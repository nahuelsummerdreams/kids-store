"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Sale = { total: number; discount: number; created_at: string };
type SaleItem = { quantity: number; unit_price: number; unit_cost: number; variants: { products: { name: string } | null } | null };
type Variant = { stock: number; min_stock: number; size: string; color: string | null; products: { name: string } | null };

const money = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type Data = { today: number; month: number; count: number; profit: number; week: { label: string; v: number }[]; top: [string, number][]; low: Variant[]; lowTotal: number };

export default function Dashboard() {
  const [d, setD] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      const from = (monthStart < weekStart ? monthStart : weekStart).toISOString();
      const s = createClient();
      const [sales, items, vars] = await Promise.all([
        s.from("sales").select("total,discount,created_at").eq("status", "completed").gte("created_at", from).returns<Sale[]>(),
        s.from("sale_items").select("quantity,unit_price,unit_cost,variants(products(name)),sales!inner(status,discount,created_at)")
          .eq("sales.status", "completed").gte("sales.created_at", monthStart.toISOString()).returns<(SaleItem & { sales: { discount: number } })[]>(),
        s.from("variants").select("stock,min_stock,size,color,products(name)").returns<Variant[]>(),
      ]);
      if (ignore) return;
      const err = sales.error ?? items.error ?? vars.error;
      if (err) return setError(err.message);

      const salesData = sales.data ?? [], itemsData = items.data ?? [], varsData = vars.data ?? [];
      const inMonth = salesData.filter((x) => new Date(x.created_at) >= monthStart);
      const todayKey = dayKey(now);
      const byDay = new Map<string, number>();
      for (const x of salesData) {
        const k = dayKey(new Date(x.created_at));
        byDay.set(k, (byDay.get(k) ?? 0) + Number(x.total));
      }
      const week = Array.from({ length: 7 }, (_, i) => {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - i));
        return { label: DAYS[day.getDay()], v: byDay.get(dayKey(day)) ?? 0 };
      });

      // Ganancia = Σ (precio − costo congelado) × cantidad − descuentos del mes.
      const gross = itemsData.reduce((a, it) => a + (Number(it.unit_price) - Number(it.unit_cost)) * it.quantity, 0);
      const disc = inMonth.reduce((a, x) => a + Number(x.discount), 0);

      const qty = new Map<string, number>();
      for (const it of itemsData) {
        const n = it.variants?.products?.name ?? "—";
        qty.set(n, (qty.get(n) ?? 0) + it.quantity);
      }
      const low = varsData.filter((v) => v.stock <= v.min_stock).sort((a, b) => a.stock - b.stock);

      if (ignore) return;
      setD({
        today: byDay.get(todayKey) ?? 0,
        month: inMonth.reduce((a, x) => a + Number(x.total), 0),
        count: inMonth.length,
        profit: gross - disc,
        week,
        top: [...qty.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
        low: low.slice(0, 6),
        lowTotal: low.length,
      });
    })();
    return () => { ignore = true; };
  }, []);

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!d) return null;

  const max = Math.max(...d.week.map((w) => w.v), 1);
  const kpis = [
    { label: "Facturación hoy", value: money(d.today), tone: "bg-sky" },
    { label: "Facturación del mes", value: money(d.month), tone: "bg-mint" },
    { label: "Ventas del mes", value: String(d.count), tone: "bg-blush" },
    { label: "Ticket promedio", value: money(d.count ? d.month / d.count : 0), tone: "bg-sky" },
    { label: "Ganancia estimada del mes", value: money(d.profit), tone: "bg-mint" },
    { label: "Productos con stock bajo", value: String(d.lowTotal), tone: "bg-blush" },
  ];

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-navy/60">Resumen en tiempo real de tu negocio.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className={`rounded-3xl p-5 ${k.tone}`}>
            <p className="text-sm text-navy/70">{k.label}</p>
            <p className="mt-2 text-2xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="font-medium">Ventas de los últimos 7 días</h2>
          <div className="mt-6 flex h-44 items-end gap-3">
            {d.week.map((w, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[11px] text-navy/60">{w.v ? money(w.v) : ""}</span>
                <div className="w-full rounded-t-xl bg-navy/80" style={{ height: `${Math.max((w.v / max) * 100, w.v ? 4 : 1)}%` }} />
                <span className="text-xs text-navy/60">{w.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="font-medium">Más vendidos del mes</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {d.top.length === 0 && <li className="text-navy/60">Sin ventas este mes.</li>}
              {d.top.map(([n, q]) => <li key={n} className="flex justify-between gap-3"><span>{n}</span><span className="font-medium">{q} u.</span></li>)}
            </ul>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="font-medium">Por agotarse</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {d.low.length === 0 && <li className="text-navy/60">Todo con stock suficiente.</li>}
              {d.low.map((v, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{v.products?.name} · {v.size}{v.color ? ` ${v.color}` : ""}</span>
                  <span className={`font-medium ${v.stock === 0 ? "text-rose-600" : ""}`}>{v.stock === 0 ? "Agotado" : v.stock}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
