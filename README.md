# Digital Studio Kids Store

Plataforma para gestionar y hacer crecer tiendas de indumentaria infantil.
*Más organización. Más creatividad. Más oportunidades de venta.*

Stack: Next.js · TypeScript · Tailwind · Supabase (Postgres, Auth, Storage, RLS) · Vercel.

## Estado

**Fase 1 — Administración (en curso)**

| Pieza | Estado |
|---|---|
| Shell visual (sidebar, paleta pastel/azul oscuro, responsive) | listo |
| Dashboard | maqueta con datos demo |
| Esquema multiempresa + RLS (`supabase/migrations/0001_core_schema.sql`) | aplicado a Supabase (proyecto `kids-store`, sa-east-1) |
| Auth, Productos, Inventario, POS, Caja, Clientes | placeholders |

## Decisiones de arquitectura

- **Multiempresa**: toda tabla lleva `tenant_id`; RLS lo limita a las membresías del usuario. Roles: `admin`, `manager`, `seller`.
- **Stock con libro de movimientos**: `variants.stock` solo cambia vía trigger sobre `stock_movements`. Hay historial y trazabilidad por diseño.
- **Costo congelado en la venta** (`sale_items.unit_cost`): la ganancia histórica no cambia si después cambia el costo.
- **Pagos combinados**: tabla `payments` con varias filas por venta.
- **Alta de negocio** por RPC `create_tenant`, sin policy de insert directo.

## Desarrollo

```bash
npm install
npm run dev
```

Variables a definir cuando se conecte Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Roadmap

1. Administración · 2. Gestión comercial · 3. Tienda online · 4. AI Content Studio · 5. Inteligencia comercial.
