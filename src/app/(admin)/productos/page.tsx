"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ProductForm, type Category } from "@/components/ProductForm";

type Variant = { id: string; size: string; color: string | null; price: number; stock: number; min_stock: number };
type Product = { id: string; name: string; brand: string | null; categories: { name: string; gender: string | null } | null; variants: Variant[] };

const money = (n: number) => `$ ${n.toLocaleString("es-AR")}`;

export default function Productos() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const supabase = createClient();
      const [p, c] = await Promise.all([
        supabase.from("products").select("id,name,brand,categories(name,gender),variants(id,size,color,price,stock,min_stock)")
          .order("created_at", { ascending: false }).returns<Product[]>(),
        supabase.from("categories").select("id,name,parent_id").order("name").returns<Category[]>(),
      ]);
      if (ignore) return;
      if (p.error || c.error) setError((p.error ?? c.error)!.message);
      else { setProducts(p.data); setCategories(c.data); setError(null); }
      setLoading(false);
    })();
    return () => { ignore = true; };
  }, [tick]);

  return (
    <section className="space-y-8">
      <header>
        <h1 className="page-title">Productos</h1>
        <p className="page-sub">Cada talle y color tiene su propio stock.</p>
      </header>

      <ProductForm categories={categories} onCreated={reload} />
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!loading && products.length === 0 && (
          <div className="card col-span-full p-10 text-center">
            <p className="display text-xl font-semibold">Todavía no cargaste productos</p>
            <p className="page-sub">Usá el formulario de arriba: elegí talles y colores y se crean todas las variantes.</p>
          </div>
        )}
        {loading && [0, 1, 2].map((i) => <div key={i} className="skeleton h-72 rounded-[28px]" />)}
        {products.map((p, idx) => {
          const stock = p.variants.reduce((s, v) => s + v.stock, 0);
          const low = p.variants.filter((v) => v.stock <= v.min_stock).length;
          const prices = p.variants.map((v) => Number(v.price));
          const tone = ({ baby: "bg-butter", girl: "bg-yolk", boy: "bg-coal", unisex: "bg-white" } as Record<string, string>)[p.categories?.gender ?? ""] ?? "bg-coal/5";
          return (
            <article key={p.id} style={{ "--i": Math.min(idx, 10) } as React.CSSProperties} className="card rise lift overflow-hidden">
              <div className={`flex h-28 items-end justify-between p-4 ${tone}`}>
                <span className={`display text-5xl font-semibold leading-none ${p.categories?.gender === "boy" ? "text-white/25" : "text-coal/25"}`}>{p.name.slice(0, 1).toUpperCase()}</span>
                <span className="chip bg-white/80">{p.categories?.name ?? "Sin categoría"}</span>
              </div>
              <div className="p-5">
                <h3 className="display text-lg font-semibold leading-tight">{p.name}</h3>
                {p.brand && <p className="text-xs text-ink/45">{p.brand}</p>}
                <p className="mt-2 text-sm font-medium">
                  {prices.length ? (Math.min(...prices) === Math.max(...prices) ? money(prices[0]) : `${money(Math.min(...prices))} – ${money(Math.max(...prices))}`) : "—"}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.variants.map((v) => (
                    <span key={v.id} className={`chip ${v.stock === 0 ? "stock-out" : v.stock <= v.min_stock ? "stock-low" : "stock-ok"}`}>
                      {v.size}{v.color ? ` ${v.color}` : ""} · {v.stock}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink/55">{stock} unidades{low ? ` · ${low} con stock bajo` : ""}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
