-- El stock nunca puede quedar negativo: un egreso mayor al stock falla.
alter table variants add constraint variants_stock_non_negative check (stock >= 0);
