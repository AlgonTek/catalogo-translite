-- Script SQL de Migração do Banco de Dados Translite (Supabase)

-- 1. Criação de Enums
DO $$ BEGIN
    CREATE TYPE public.demand_level AS ENUM ('alta', 'media', 'baixa');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Tabela de Produtos (products)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL DEFAULT '',
    nome TEXT NOT NULL,
    descricao TEXT,
    preco_lote NUMERIC NOT NULL,
    preco_revenda NUMERIC NOT NULL,
    quantidade_minima INTEGER NOT NULL DEFAULT 1,
    imagem_url TEXT,
    imagens TEXT[] DEFAULT '{}',
    categoria TEXT NOT NULL,
    destaque BOOLEAN NOT NULL DEFAULT false,
    mais_vendido BOOLEAN NOT NULL DEFAULT false,
    demanda public.demand_level NOT NULL DEFAULT 'media',
    lucro_estimado NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabela de Papéis de Utilizador (user_roles)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- 4. Função RLS e Verificação de Roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = _user_id AND role = _role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Ativação de RLS (Row Level Security)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para products (Leitura pública, escrita apenas para autenticados / admin)
DROP POLICY IF EXISTS "Permitir leitura pública de produtos" ON public.products;
CREATE POLICY "Permitir leitura pública de produtos" ON public.products
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção e edição por autenticados" ON public.products;
CREATE POLICY "Permitir inserção e edição por autenticados" ON public.products
    FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para user_roles
DROP POLICY IF EXISTS "Permitir leitura dos próprios papéis" ON public.user_roles;
CREATE POLICY "Permitir leitura dos próprios papéis" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Permitir criação de papéis por autenticados" ON public.user_roles;
CREATE POLICY "Permitir criação de papéis por autenticados" ON public.user_roles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 6. Inserção / Sincronização dos Produtos Padrão
INSERT INTO public.products (id, codigo, nome, descricao, preco_lote, preco_revenda, quantidade_minima, imagem_url, imagens, categoria, destaque, mais_vendido, demanda, lucro_estimado)
VALUES
('d0000000-0000-0000-0000-000000000001', 'TRL-2026-01', 'Kit Carregadores Rápidos Type-C 20W PD', 'Kit atacado com 20 carregadores rápidos de 20W com tecnologia Power Delivery. Compatível com os modelos mais recentes de smartphones.', 4500, 450, 20, 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1622445268121-da119685a2bc?w=800&auto=format&fit=crop&q=80'], 'Eletrónicos', true, true, 'alta', 4500),
('d0000000-0000-0000-0000-000000000002', 'TRL-2026-02', 'Fones Bluetooth TWS Pro ANC Premium', 'Lote de 10 auriculares sem fios TWS com cancelamento ativo de ruído, estojo de carregamento com visor digital.', 6800, 1200, 10, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=800&auto=format&fit=crop&q=80'], 'Acessórios', true, true, 'alta', 5200),
('d0000000-0000-0000-0000-000000000003', 'TRL-2026-03', 'Smartwatch Fitness T900 Ultra HD', 'Relógios inteligentes em lote de 5 unidades. Monitorização cardíaca, múltiplos modos desportivos, chamadas Bluetooth.', 5500, 1800, 5, 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'], 'Gadgets', true, false, 'alta', 3500),
('d0000000-0000-0000-0000-000000000004', 'TRL-2026-04', 'Caixa de Som Portátil Bluetooth Waterproof 20W', 'Lote de 8 colunas de som Bluetooth com graves potentes, iluminação RGB e proteção IPX6 contra água.', 7200, 1500, 8, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80'], 'Áudio', false, true, 'media', 4800),
('d0000000-0000-0000-0000-000000000005', 'TRL-2026-05', 'Cabos USB-C Reforçados Nylon Trançado (50un)', 'Caixa no atacado com 50 cabos de carregamento rápido e transferência de dados de 1 metro com blindagem reforçada.', 3500, 150, 50, 'https://images.unsplash.com/photo-1616440342232-157f2a14e6c2?w=800&auto=format&fit=crop&q=80', ARRAY['https://images.unsplash.com/photo-1616440342232-157f2a14e6c2?w=800&auto=format&fit=crop&q=80'], 'Acessórios', false, false, 'alta', 4000)
ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    codigo = EXCLUDED.codigo,
    descricao = EXCLUDED.descricao,
    preco_lote = EXCLUDED.preco_lote,
    preco_revenda = EXCLUDED.preco_revenda,
    quantidade_minima = EXCLUDED.quantidade_minima,
    imagem_url = EXCLUDED.imagem_url,
    imagens = EXCLUDED.imagens,
    categoria = EXCLUDED.categoria,
    destaque = EXCLUDED.destaque,
    mais_vendido = EXCLUDED.mais_vendido,
    demanda = EXCLUDED.demanda,
    lucro_estimado = EXCLUDED.lucro_estimado,
    updated_at = NOW();
