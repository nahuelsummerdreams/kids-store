import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export default function Page() {
  return (
    <ModulePlaceholder
      title="Ventas (POS)"
      items={["Búsqueda y carrito","Pagos combinados y parciales","Cambios y devoluciones","Descuento automático de stock"]}
    />
  );
}
