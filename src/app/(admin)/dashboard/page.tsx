// DATOS DEMO: se reemplazan por consultas a Supabase cuando exista el módulo de ventas.
const KPIS = [
  { label: "Facturación hoy", value: "$ 186.500", tone: "bg-sky" },
  { label: "Facturación del mes", value: "$ 3.420.000", tone: "bg-mint" },
  { label: "Ventas", value: "142", tone: "bg-blush" },
  { label: "Ticket promedio", value: "$ 24.080", tone: "bg-sky" },
  { label: "Ganancia estimada", value: "$ 1.368.000", tone: "bg-mint" },
  { label: "Pedidos pendientes", value: "6", tone: "bg-blush" },
];

const LOW_STOCK = [
  { name: "Buzo canguro nene · T6 · Gris", left: 1 },
  { name: "Vestido lino nena · T4 · Rosa", left: 2 },
  { name: "Conjunto bebé algodón · 6-9m · Verde", left: 2 },
];

const WEEK = [38, 52, 44, 71, 63, 88, 74];

export default function Dashboard() {
  const max = Math.max(...WEEK);
  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-navy/60">Vista de ejemplo con datos demo.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {KPIS.map((k) => (
          <div key={k.label} className={`rounded-3xl p-5 ${k.tone}`}>
            <p className="text-sm text-navy/70">{k.label}</p>
            <p className="mt-2 text-2xl font-semibold">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="font-medium">Ventas de la semana</h2>
          <div className="mt-6 flex h-40 items-end gap-3">
            {WEEK.map((v, i) => (
              <div key={i} className="flex-1 rounded-t-xl bg-navy/80" style={{ height: `${(v / max) * 100}%` }} />
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="font-medium">Por agotarse</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {LOW_STOCK.map((p) => (
              <li key={p.name} className="flex justify-between gap-3">
                <span>{p.name}</span>
                <span className="font-medium text-rose-600">{p.left}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
