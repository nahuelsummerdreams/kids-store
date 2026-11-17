"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Sale = { total: number; discount: number; created_at: string };
type SaleItem = { quantity: number; unit_price: number; unit_cost: number; variants: { products: { name: string } | null } | null };
type Variant = { stock: number; min_stock: number; size: string; color: string | null; products: { name: string } | null };

const money = (n: number) => `$ ${Math.round(n).toLocaleString("es-AR")}`;
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const compact = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`);
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
  if (!d) return <div className="h-64 animate-pulse rounded-[28px] bg-white/70" />;

  const max = Math.max(...d.week.map((w) => w.v), 1);
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const avg = d.count ? d.month / d.count : 0;
  const small = [
    { label: "Ventas del mes", value: String(d.count), tone: "bg-sky/60" },
    { label: "Ticket promedio", value: money(avg), tone: "bg-mint/70" },
    { label: "Ganancia estimada", value: money(d.profit), tone: "bg-sun/60" },
    { label: "Stock bajo", value: String(d.lowTotal), tone: "bg-blush/70" },
  ];

  return (
    <section className="space-y-8">
      <header>
        <p className="eyebrow">{new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="page-title mt-1">{greet} 👋</h1>
      </header>

      <div className="relative overflow-hidden rounded-[32px] bg-navy p-7 text-white md:p-9">
        <div className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-sky/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-blush/20 blur-2xl" />
        <p className="eyebrow !text-white/55">Facturación de hoy</p>
        <p className="display mt-2 text-5xl font-semibold md:text-6xl">{money(d.today)}</p>
        <p className="mt-3 text-sm text-white/65">
          {money(d.month)} en lo que va del mes
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {small.map((k) => (
          <div key={k.label} className={`rounded-[24px] p-5 ${k.tone}`}>
            <p className="text-xs font-medium text-ink/60">{k.label}</p>
            <p className="display mt-2 text-2xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="display text-lg font-semibold">Últimos 7 días</h2>
          <div className="mt-6 flex h-48 items-end gap-2 md:gap-4">
            {d.week.map((w, i) => {
              const today = i === d.week.length - 1;
              return (
                <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px] text-ink/50 md:text-xs">{w.v ? compact(w.v) : ""}</span>
                  <div
                    className={`w-full rounded-2xl transition-all ${today ? "bg-navy" : "bg-sky"}`}
                    style={{ height: `${Math.max((w.v / max) * 100, 3)}%` }}
                  />
                  <span className={`text-xs ${today ? "font-semibold text-navy" : "text-ink/50"}`}>{w.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="display text-lg font-semibold">Más vendidos</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {d.top.length === 0 && <li className="text-ink/50">Todavía no hay ventas este mes.</li>}
              {d.top.map(([n, q], i) => (
                <li key={n} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sun/70 text-xs font-semibold">{i + 1}</span>
                  <span className="flex-1 truncate">{n}</span>
                  <span className="font-medium">{q} u.</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <h2 className="display text-lg font-semibold">Por agotarse</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {d.low.length === 0 && <li className="text-ink/50">Todo con stock suficiente. 🎉</li>}
              {d.low.map((v, i) => (
                <li key={i} className="flex items-center justify-between gap-3">
                  <span className="truncate">{v.products?.name} · {v.size}{v.color ? ` ${v.color}` : ""}</span>
                  <span className={`chip ${v.stock === 0 ? "bg-rose-100 text-rose-700" : "bg-blush text-ink"}`}>{v.stock === 0 ? "Agotado" : `${v.stock} u.`}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
