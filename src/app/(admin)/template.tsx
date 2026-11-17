// Se vuelve a montar en cada navegación: la página entra con una animación suave.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="rise">{children}</div>;
}
