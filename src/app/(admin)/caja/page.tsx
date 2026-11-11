import { ModulePlaceholder } from "@/components/ModulePlaceholder";

export default function Page() {
  return (
    <ModulePlaceholder
      title="Caja"
      items={["Apertura y cierre diario","Ingresos, egresos y retiros","Diferencias de caja","Ventas por medio de pago"]}
    />
  );
}
