import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export default function Page() {
  return (
    <ModulePlaceholder
      title="Clientes y familias"
      items={["Datos del cliente","Perfiles infantiles con talles habituales","Historial de compras","Oportunidades de renovación de talle (orientativas)"]}
    />
  );
}
