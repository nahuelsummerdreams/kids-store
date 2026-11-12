-- Caja: movimientos manuales, una sola caja abierta a la vez y efectivo esperado al cierre.
create type cash_movement_kind as enum ('income', 'expense', 'withdrawal');

create table cash_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  cash_session_id uuid not null references cash_sessions(id) on delete cascade,
  kind cash_movement_kind not null,
  amount numeric(12,2) not null check (amount > 0),
  note text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index on cash_movements (tenant_id, cash_session_id);

alter table cash_movements enable row level security;
create policy cash_movements_read on cash_movements for select using (is_member(tenant_id));
create policy cash_movements_ins on cash_movements for insert
  with check (has_role(tenant_id, array['admin','manager','seller']::app_role[]));
create policy cash_movements_del on cash_movements for delete
  using (has_role(tenant_id, array['admin']::app_role[]));

alter table cash_sessions add column expected_amount numeric(12,2);
create unique index one_open_cash_session on cash_sessions (tenant_id) where closed_at is null;
