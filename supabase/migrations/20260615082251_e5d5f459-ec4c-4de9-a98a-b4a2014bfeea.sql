
-- 1) Restrict lucro_estimado (internal profit) from public; pricing (preco_lote/preco_revenda) stays public by design (B2B reseller catalog)
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (id, codigo, nome, descricao, categoria, preco_lote, preco_revenda, quantidade_minima, imagens, imagem_url, destaque, mais_vendido, demanda, created_at, updated_at) ON public.products TO anon;

-- 2) Block privilege escalation: restrictive policy preventing non-admins from writing to user_roles
CREATE POLICY "Only admins can write user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
TO authenticated, anon
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3) Revoke EXECUTE on SECURITY DEFINER functions from public roles
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
