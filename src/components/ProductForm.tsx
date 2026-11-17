"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { getTenantId } from "@/lib/tenant";

export type Category = { id: string; name: string; parent_id: string | null };

const SEASONS = [
  ["spring", "Primavera"], ["summer", "Verano"], ["autumn", "Otoño"], ["winter", "Invierno"],
] as const;

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const code = (s: string) => s.normalize("NFD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 4);
const input = "field w-full";

export function ProductForm({ categories, onCreated }: { categories: Category[]; onCreated: () => void }) {
  const [f, setF] = useState({
    name: "", categoryId: "", season: "", brand: "",
    price: "", cost: "", sizes: "", colors: "", stock: "0", minStock: "1",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: e.target.value });

  const sizes = list(f.sizes);
  const colors = list(f.colors);
  const combos = sizes.length * Math.max(colors.length, 1);
  const parents = categories.filter((c) => !c.parent_id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const price = Number(f.price), cost = Number(f.cost || 0), stock = Number(f.stock || 0);
    if (!sizes.length) return setError("Cargá al menos un talle.");
    if (!(price >= 0) || !(cost >= 0) || !Number.isInteger(stock) || stock < 0)
      return setError("Revisá precio, costo y stock.");

    setSaving(true);
    const supabase = createClient();
    try {
      const tenant_id = await getTenantId();
      const { data: product, error: pe } = await supabase.from("products").insert({
        tenant_id, name: f.name.trim(), category_id: f.categoryId || null,
        season: f.season || null, brand: f.brand.trim() || null,
      }).select("id").single();
      if (pe) throw pe;

      const base = `${code(f.name) || "PRD"}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const rows = sizes.flatMap((size) =>
        (colors.length ? colors : [null]).map((color) => ({
          tenant_id, product_id: product.id, size, color, price, cost,
          min_stock: Number(f.minStock || 0),
          sku: [base, code(size), color && code(color)].filter(Boolean).join("-"),
        })),
      );
      const { data: variants, error: ve } = await supabase.from("variants").insert(rows).select("id");
      if (ve) {
        await supabase.from("products").delete().eq("id", product.id); // evita productos sin variantes
        throw ve;
      }
      if (stock > 0) {
        const { error: se } = await supabase.from("stock_movements").insert(
          variants.map((v) => ({ tenant_id, variant_id: v.id, delta: stock, reason: "adjustment", note: "Stock inicial" })),
        );
        if (se) throw se;
      }
      setF({ ...f, name: "", sizes: "", colors: "", price: "", cost: "" });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 card p-6">
      <h2 className="display text-lg font-semibold">Nuevo producto</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input required placeholder="Nombre (ej. Buzo canguro)" value={f.name} onChange={set("name")} className={input} />
        <select value={f.categoryId} onChange={set("categoryId")} className={input}>
          <option value="">Categoría</option>
          {parents.map((p) => (
            <optgroup key={p.id} label={p.name}>
              {categories.filter((c) => c.parent_id === p.id).map((c) => (
                <option key={c.id} value={c.id}>{p.name} · {c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={f.season} onChange={set("season")} className={input}>
          <option value="">Temporada</option>
          {SEASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input placeholder="Marca (opcional)" value={f.brand} onChange={set("brand")} className={input} />
        <input required inputMode="decimal" placeholder="Precio de venta" value={f.price} onChange={set("price")} className={input} />
        <input inputMode="decimal" placeholder="Precio de compra" value={f.cost} onChange={set("cost")} className={input} />
        <input required placeholder="Talles separados por coma (ej. 2, 4, 6)" value={f.sizes} onChange={set("sizes")} className={input} />
        <input placeholder="Colores separados por coma (opcional)" value={f.colors} onChange={set("colors")} className={input} />
        <label className="space-y-1"><span className="text-xs text-ink/55">Stock inicial por variante</span><input inputMode="numeric" value={f.stock} onChange={set("stock")} className={input} /></label>
        <label className="space-y-1"><span className="text-xs text-ink/55">Avisar cuando queden (stock mínimo)</span><input inputMode="numeric" value={f.minStock} onChange={set("minStock")} className={input} /></label>
      </div>
      {sizes.length > 0 && (
        <p className="text-sm text-ink/55">Se crearán {combos} variantes ({sizes.length} talles × {Math.max(colors.length, 1)} colores).</p>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button disabled={saving} className="btn btn-primary">
        {saving ? "Guardando…" : "Guardar producto"}
      </button>
    </form>
  );
}
