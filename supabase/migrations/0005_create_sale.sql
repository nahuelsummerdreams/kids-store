-- Venta atómica. SECURITY INVOKER: corre con los permisos (RLS) de quien vende.
-- Precio y costo se leen de la base; el cliente solo envía variante y cantidad.
create function create_sale(p_discount numeric, p_items jsonb, p_payments jsonb)
returns uuid
language plpgsql set search_path = public as $$
declare
  sid uuid; tid uuid; cs uuid;
  it jsonb; v variants; q int;
  subtotal numeric := 0; total numeric; paid numeric;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;
  if coalesce(p_discount, 0) < 0 then raise exception 'Descuento inválido'; end if;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into v from variants where id = (it->>'variant_id')::uuid;
    if not found then raise exception 'Producto inexistente'; end if;
    q := (it->>'quantity')::int;
    if q is null or q <= 0 then raise exception 'Cantidad inválida'; end if;
    tid := v.tenant_id;
    subtotal := subtotal + v.price * q;
  end loop;

  if coalesce(p_discount, 0) > subtotal then raise exception 'El descuento supera el total'; end if;
  total := subtotal - coalesce(p_discount, 0);

  select coalesce(sum((p->>'amount')::numeric), 0) into paid from jsonb_array_elements(coalesce(p_payments, '[]')) p;
  if paid <> total then raise exception 'Los pagos (%) no coinciden con el total (%)', paid, total; end if;

  select id into cs from cash_sessions where tenant_id = tid and closed_at is null order by opened_at desc limit 1;

  insert into sales (tenant_id, cash_session_id, discount, total)
  values (tid, cs, coalesce(p_discount, 0), total) returning id into sid;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into v from variants where id = (it->>'variant_id')::uuid;
    q := (it->>'quantity')::int;
    insert into sale_items (tenant_id, sale_id, variant_id, quantity, unit_price, unit_cost)
    values (tid, sid, v.id, q, v.price, v.cost);
    -- Si no alcanza el stock, el check de variants.stock >= 0 aborta toda la venta.
    insert into stock_movements (tenant_id, variant_id, delta, reason, ref_id)
    values (tid, v.id, -q, 'sale', sid);
  end loop;

  insert into payments (tenant_id, sale_id, method, amount)
  select tid, sid, (p->>'method')::payment_method, (p->>'amount')::numeric
  from jsonb_array_elements(coalesce(p_payments, '[]')) p;

  return sid;
end $$;

revoke execute on function create_sale(numeric, jsonb, jsonb) from public, anon;
grant execute on function create_sale(numeric, jsonb, jsonb) to authenticated;
