import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export default function Page() {
  return (
    <ModulePlaceholder
      title="Productos"
      items={["Ficha de producto (SKU, código de barras, margen)","Variantes: talle × color × estampado","Categorías Bebé / Nena / Nene y temporadas"]}
    />
  );
}
