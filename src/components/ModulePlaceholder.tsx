export function ModulePlaceholder({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-navy/60">Módulo en construcción · Fase 1</p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((i) => (
          <li key={i} className="rounded-3xl bg-white p-5 text-sm shadow-sm">
            {i}
          </li>
        ))}
      </ul>
    </section>
  );
}
