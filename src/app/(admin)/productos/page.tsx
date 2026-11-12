"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { ProductForm, type Category } from "@/components/ProductForm";

type Variant = { id: string; size: string; color: string | null; price: number; stock: number; min_stock: number };
type Product = { id: string; name: string; brand: string | null; categories: { name: string } | null; variants: Variant[] };

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
        supabase.from("products").select("id,name,brand,categories(name),variants(id,size,color,price,stock,min_stock)")
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
        <h1 className="text-2xl font-semibold">Productos</h1>
        <p className="mt-1 text-sm text-navy/60">Cada talle y color tiene su propio stock.</p>
      </header>

      <ProductForm categories={categories} onCreated={reload} />
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {!loading && products.length === 0 && (
          <p className="text-sm text-navy/60">Todavía no cargaste productos.</p>
        )}
        {products.map((p) => {
          const stock = p.variants.reduce((s, v) => s + v.stock, 0);
          const low = p.variants.filter((v) => v.stock <= v.min_stock).length;
          const prices = p.variants.map((v) => Number(v.price));
          return (
            <article key={p.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <p className="text-xs text-navy/50">{p.categories?.name ?? "Sin categoría"}{p.brand ? ` · ${p.brand}` : ""}</p>
              <h3 className="mt-1 font-medium">{p.name}</h3>
              <p className="mt-2 text-sm">
                {prices.length ? (Math.min(...prices) === Math.max(...prices) ? money(prices[0]) : `${money(Math.min(...prices))} – ${money(Math.max(...prices))}`) : "—"}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.variants.map((v) => (
                  <span key={v.id} className={`rounded-full px-2.5 py-1 text-xs ${v.stock <= v.min_stock ? "bg-blush" : "bg-mint"}`}>
                    {v.size}{v.color ? ` ${v.color}` : ""} · {v.stock}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-navy/60">{stock} unidades{low ? ` · ${low} con stock bajo` : ""}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
