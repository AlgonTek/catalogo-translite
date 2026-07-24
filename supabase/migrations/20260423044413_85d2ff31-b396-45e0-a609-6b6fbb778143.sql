ALTER TABLE public.products ADD COLUMN IF NOT EXISTS imagens text[] NOT NULL DEFAULT '{}';

-- Backfill: copiar imagem_url existente para o array imagens
UPDATE public.products
SET imagens = ARRAY[imagem_url]
WHERE imagem_url IS NOT NULL AND (imagens IS NULL OR array_length(imagens, 1) IS NULL);