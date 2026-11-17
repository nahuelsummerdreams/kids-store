import { IconBoxes, IconCart, IconHome, IconReceipt, IconTag, IconWallet } from "@/components/Icons";

export const NAV = [
  { href: "/dashboard", label: "Inicio", Icon: IconHome },
  { href: "/ventas", label: "Vender", Icon: IconCart },
  { href: "/productos", label: "Productos", Icon: IconTag },
  { href: "/inventario", label: "Inventario", Icon: IconBoxes },
  { href: "/historial", label: "Ventas", Icon: IconReceipt },
  { href: "/caja", label: "Caja", Icon: IconWallet },
] as const;
