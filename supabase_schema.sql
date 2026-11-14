-- ============================================================================
-- SISTEMA DE CONTROLE DE SERVIÇOS EXTRAS - SCRIPT DE BANCO DE DADOS (SUPABASE)
-- Execute este script no "SQL Editor" do seu painel no Supabase (supabase.com)
-- ============================================================================

-- 1. Tabela de Empresas
CREATE TABLE IF NOT EXISTS public.empresas (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cnpj TEXT DEFAULT '',
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Cargos
CREATE TABLE IF NOT EXISTS public.cargos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabela de Colaboradores
CREATE TABLE IF NOT EXISTS public.colaboradores (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    cargo_id TEXT REFERENCES public.cargos(id) ON DELETE SET NULL,
    cargo_nome TEXT NOT NULL,
    documento TEXT DEFAULT '',
    telefone TEXT DEFAULT '',
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabela de Valores (Empresa + Cargo + Valor)
CREATE TABLE IF NOT EXISTS public.tabela_valores (
    id TEXT PRIMARY KEY,
    empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    empresa_nome TEXT NOT NULL,
    cargo_id TEXT NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
    cargo_nome TEXT NOT NULL,
    valor NUMERIC(10,2) NOT NULL DEFAULT 0,
    atualizado_em TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(empresa_id, cargo_id)
);

-- 5. Tabela de Usuários Autorizados (Solicitantes/Lançadores e Administradores)
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    login TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    perfil TEXT NOT NULL CHECK (perfil IN ('LANCADOR', 'ADM')),
    ativo BOOLEAN DEFAULT TRUE,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de Lançamentos de Serviços Extras
CREATE TABLE IF NOT EXISTS public.lancamentos (
    id TEXT PRIMARY KEY,
    colaborador_id TEXT NOT NULL,
    colaborador_nome TEXT NOT NULL,
    cargo_id TEXT DEFAULT '',
    cargo_nome TEXT NOT NULL,
    empresa_id TEXT NOT NULL,
    empresa_nome TEXT NOT NULL,
    data_trabalho DATE NOT NULL,
    turno TEXT NOT NULL CHECK (turno IN ('Manhã', 'Tarde', 'Noite')),
    motivo TEXT NOT NULL,
    valor_tabela NUMERIC(10,2) DEFAULT 0,
    valor NUMERIC(10,2) NOT NULL DEFAULT 0,
    valor_alterado_manual BOOLEAN DEFAULT FALSE,
    solicitante_id TEXT DEFAULT '',
    solicitante_nome TEXT NOT NULL,
    lancado_por_id TEXT NOT NULL,
    lancado_por_nome TEXT NOT NULL,
    lancado_por_login TEXT NOT NULL,
    status_lancamento TEXT NOT NULL DEFAULT 'ATIVO' CHECK (status_lancamento IN ('ATIVO', 'CANCELADO')),
    status_pagamento TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status_pagamento IN ('PENDENTE', 'PAGO')),
    data_pagamento TIMESTAMPTZ,
    fechamento_ref TEXT DEFAULT '',
    conservar_legal BOOLEAN DEFAULT FALSE,
    historico JSONB DEFAULT '[]'::jsonb,
    criado_em TIMESTAMPTZ DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas rápidas por período, empresa e colaborador
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON public.lancamentos(data_trabalho);
CREATE INDEX IF NOT EXISTS idx_lancamentos_empresa ON public.lancamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_colaborador ON public.lancamentos(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_pagamento ON public.lancamentos(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_criado_em ON public.lancamentos(criado_em);

-- Habilitar RLS e liberar acesso para a chave da aplicação
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabela_valores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso App Empresas" ON public.empresas;
CREATE POLICY "Acesso App Empresas" ON public.empresas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso App Cargos" ON public.cargos;
CREATE POLICY "Acesso App Cargos" ON public.cargos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso App Colaboradores" ON public.colaboradores;
CREATE POLICY "Acesso App Colaboradores" ON public.colaboradores FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso App Tabela Valores" ON public.tabela_valores;
CREATE POLICY "Acesso App Tabela Valores" ON public.tabela_valores FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso App Usuarios" ON public.usuarios;
CREATE POLICY "Acesso App Usuarios" ON public.usuarios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso App Lancamentos" ON public.lancamentos;
CREATE POLICY "Acesso App Lancamentos" ON public.lancamentos FOR ALL USING (true) WITH CHECK (true);

-- Inserir usuário Administrador inicial (Login: admin / Senha: 123456)
INSERT INTO public.usuarios (id, nome, login, senha, perfil, ativo)
VALUES ('usr_admin_1', 'Administrador Geral', 'admin', '123456', 'ADM', true)
ON CONFLICT (login) DO NOTHING;
