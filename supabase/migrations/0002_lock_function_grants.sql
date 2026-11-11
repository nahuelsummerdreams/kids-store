-- Supabase concede EXECUTE a anon/authenticated por defecto; "revoke from public" no lo quita.
revoke execute on function apply_stock_movement() from public, anon, authenticated;
revoke execute on function is_member(uuid) from anon;
revoke execute on function has_role(uuid, app_role[]) from anon;
revoke execute on function create_tenant(text) from anon;
