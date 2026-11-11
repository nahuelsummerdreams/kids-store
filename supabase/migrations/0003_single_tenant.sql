-- Instalación de un solo negocio: nadie más puede crear tenants.
revoke execute on function create_tenant(text) from authenticated;
