import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export default function Page() {
  return (
    <ModulePlaceholder
      title="Inventario"
      items={["Stock por talle y color","Historial de movimientos","Alertas de stock mínimo","Reposición sugerida"]}
    />
  );
}
