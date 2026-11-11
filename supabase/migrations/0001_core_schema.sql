-- Digital Studio Kids Store · Fase 1 · esquema base multiempresa
-- Aislamiento: cada fila lleva tenant_id y RLS lo restringe a las membresías del usuario.

create extension if not exists pgcrypto;

-- ───────── Tenancy ─────────
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create type app_role as enum ('admin', 'manager', 'seller');

create table memberships (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'seller',
  primary key (tenant_id, user_id)
);

-- SECURITY DEFINER evita recursión de RLS al consultar memberships.
create function is_member(t uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships where tenant_id = t and user_id = auth.uid());
$$;

create function has_role(t uuid, roles app_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from memberships
                 where tenant_id = t and user_id = auth.uid() and role = any(roles));
$$;

-- ───────── Catálogo ─────────
create table categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  parent_id uuid references categories(id) on delete set null,
  name text not null,
  gender text check (gender in ('baby', 'girl', 'boy', 'unisex')),
  unique (tenant_id, parent_id, name)
);

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  contact jsonb not null default '{}'
);

create table products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  name text not null,
  description text,
  brand text,
  season text check (season in ('spring', 'summer', 'autumn', 'winter')),
  image_path text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Cada combinación talle × color tiene su propio stock y precio.
create table variants (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  sku text not null,
  barcode text,
  size text not null,
  color text,
  print text,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  price numeric(12,2) not null check (price >= 0),
  stock integer not null default 0,
  min_stock integer not null default 0,
  unique (tenant_id, sku)
);
create index on variants (tenant_id, product_id);

-- ───────── Inventario (libro de movimientos) ─────────
create type stock_reason as enum
  ('purchase', 'sale', 'return', 'adjustment', 'transfer_in', 'transfer_out');

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  variant_id uuid not null references variants(id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason stock_reason not null,
  ref_id uuid,
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on stock_movements (tenant_id, variant_id, created_at desc);

-- variants.stock se mantiene solo desde el libro: una única fuente de verdad.
create function apply_stock_movement() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update variants set stock = stock + new.delta
  where id = new.variant_id and tenant_id = new.tenant_id;
  return new;
end $$;

create trigger trg_apply_stock after insert on stock_movements
for each row execute function apply_stock_movement();

-- ───────── Clientes y familias ─────────
create table customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  address text,
  birthday date,
  created_at timestamptz not null default now()
);

create table children (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  name text not null,
  birth_date date,
  usual_sizes text[] not null default '{}',
  preferences text
);

-- ───────── Caja y ventas ─────────
create table cash_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  opened_by uuid default auth.uid(),
  opened_at timestamptz not null default now(),
  opening_amount numeric(12,2) not null default 0,
  closed_at timestamptz,
  counted_amount numeric(12,2)
);

create type sale_status as enum ('completed', 'cancelled', 'returned');
create type payment_method as enum ('cash', 'transfer', 'debit', 'credit', 'mercado_pago', 'other');

create table sales (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  cash_session_id uuid references cash_sessions(id) on delete set null,
  seller_id uuid default auth.uid(),
  status sale_status not null default 'completed',
  discount numeric(12,2) not null default 0 check (discount >= 0),
  total numeric(12,2) not null check (total >= 0),
  created_at timestamptz not null default now()
);
create index on sales (tenant_id, created_at desc);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  sale_id uuid not null references sales(id) on delete cascade,
  variant_id uuid not null references variants(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  unit_cost numeric(12,2) not null default 0   -- congelado para calcular ganancia histórica
);

-- Pagos combinados: una venta puede tener varias filas.
create table payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  sale_id uuid not null references sales(id) on delete cascade,
  method payment_method not null,
  amount numeric(12,2) not null check (amount > 0)
);

-- ───────── Auditoría ─────────
create table audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid default auth.uid(),
  action text not null,
  entity text not null,
  entity_id uuid,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- ───────── RLS ─────────
alter table tenants enable row level security;
alter table memberships enable row level security;
create policy tenants_read on tenants for select using (is_member(id));
create policy memberships_read on memberships for select using (user_id = auth.uid() or is_member(tenant_id));

-- Tablas operativas: lectura para miembros; escritura según rol.
do $$
declare t text;
begin
  foreach t in array array['categories','suppliers','products','variants','stock_movements',
    'customers','children','cash_sessions','sales','sale_items','payments']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy %I on %I for select using (is_member(tenant_id))', t||'_read', t);
    execute format($p$create policy %I on %I for insert with check (has_role(tenant_id, array['admin','manager','seller']::app_role[]))$p$, t||'_ins', t);
    execute format($p$create policy %I on %I for update using (has_role(tenant_id, array['admin','manager']::app_role[])) with check (has_role(tenant_id, array['admin','manager']::app_role[]))$p$, t||'_upd', t);
    execute format($p$create policy %I on %I for delete using (has_role(tenant_id, array['admin']::app_role[]))$p$, t||'_del', t);
  end loop;
end $$;

-- Catálogo y compras: el vendedor solo consulta, no crea ni modifica.
drop policy products_ins on products;
drop policy variants_ins on variants;
drop policy categories_ins on categories;
drop policy suppliers_ins on suppliers;
create policy products_ins on products for insert with check (has_role(tenant_id, array['admin','manager']::app_role[]));
create policy variants_ins on variants for insert with check (has_role(tenant_id, array['admin','manager']::app_role[]));
create policy categories_ins on categories for insert with check (has_role(tenant_id, array['admin','manager']::app_role[]));
create policy suppliers_ins on suppliers for insert with check (has_role(tenant_id, array['admin','manager']::app_role[]));

-- Auditoría: lectura solo admin; se escribe desde el servidor.
alter table audit_log enable row level security;
create policy audit_read on audit_log for select using (has_role(tenant_id, array['admin']::app_role[]));
create policy audit_ins on audit_log for insert with check (is_member(tenant_id));

-- ───────── Alta de negocio ─────────
-- El usuario autenticado crea su comercio y queda como admin (no hay policy de insert directo).
create function create_tenant(p_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  insert into tenants (name) values (p_name) returning id into t;
  insert into memberships (tenant_id, user_id, role) values (t, auth.uid(), 'admin');
  return t;
end $$;
revoke all on function create_tenant(text) from public;
grant execute on function create_tenant(text) to authenticated;
