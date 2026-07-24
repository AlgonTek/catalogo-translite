ALTER TABLE public.products DROP COLUMN lucro_estimado;
ALTER TABLE public.products
  ALTER COLUMN preco_lote TYPE numeric(14,2),
  ALTER COLUMN preco_revenda TYPE numeric(14,2);
ALTER TABLE public.products
  ADD COLUMN lucro_estimado numeric(14,2)
  GENERATED ALWAYS AS ((preco_revenda * quantidade_minima) - preco_lote) STORED;