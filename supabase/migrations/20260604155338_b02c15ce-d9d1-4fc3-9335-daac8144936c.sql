
CREATE SEQUENCE IF NOT EXISTS public.products_codigo_seq START 1;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS codigo TEXT;

UPDATE public.products
SET codigo = 'P-' || LPAD(nextval('public.products_codigo_seq')::text, 4, '0')
WHERE codigo IS NULL;

CREATE OR REPLACE FUNCTION public.set_product_codigo()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'P-' || LPAD(nextval('public.products_codigo_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_product_codigo ON public.products;
CREATE TRIGGER trg_set_product_codigo
BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_product_codigo();

ALTER TABLE public.products ALTER COLUMN codigo SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS products_codigo_key ON public.products(codigo);
