-- ============================================================
-- Projetista.Ai — Demo Seed Data
-- Creates a demo organization with realistic sample data
-- for showing to prospects and investors.
--
-- Run AFTER 001_initial_schema.sql
-- ============================================================

-- ── Demo organization ────────────────────────────────────────
insert into organizations (id, name, slug)
values (
  'b0000000-0000-0000-0000-000000000002',
  'Demo — Consultoria Rural Ltda',
  'demo-consultoria'
)
on conflict (slug) do nothing;

-- ── Demo clients ─────────────────────────────────────────────
insert into clients (id, organization_id, name, cpf, whatsapp, email, city, state, farm_name, farm_address, status)
values
  (
    'c1000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'João da Silva',
    '123.456.789-00',
    '+55 34 99123-4567',
    'joao@fazendaboavista.com.br',
    'Uberaba',
    'MG',
    'Fazenda Boa Vista',
    'Rod. MG-050, km 120, Zona Rural',
    'Ativo'
  ),
  (
    'c2000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'Maria Aparecida Costa',
    '987.654.321-00',
    '+55 64 98765-4321',
    'maria@fazendacosta.com.br',
    'Rio Verde',
    'GO',
    'Fazenda Santa Maria',
    'Zona Rural, Estrada Velha s/n',
    'Ativo'
  ),
  (
    'c3000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'Pedro Henrique Alves',
    '456.123.789-11',
    '+55 65 91234-5678',
    'pedro@agropecuariaalves.com.br',
    'Sorriso',
    'MT',
    'Agropecuária Alves',
    'Fazenda km 30, Rodovia MT-242',
    'Ativo'
  ),
  (
    'c4000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000002',
    'Ana Lima Ferreira',
    '321.654.987-22',
    '+55 77 99876-5432',
    'ana@fazendaferreira.com.br',
    'Barreiras',
    'BA',
    'Fazenda Cerrado Verde',
    'Estrada Barreiras–São Desidério, km 18',
    'Ativo'
  ),
  (
    'c5000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000002',
    'Carlos Eduardo Souza',
    '654.321.987-33',
    '+55 61 97654-3210',
    'carlos@gruposaouza.com.br',
    'Luís Eduardo Magalhães',
    'BA',
    'Grupo São Souza',
    'Fazenda Três Lagoas, Rod. BR-020',
    'Ativo'
  )
on conflict (id) do nothing;

-- ── Demo applications ────────────────────────────────────────
insert into applications (id, organization_id, client_id, loan_type, bank, amount, commission_pct, status)
values
  -- João: Pronaf Custeio aprovado
  (
    'a1000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'Pronaf Custeio',
    'Banco do Brasil',
    280000.00,
    2.5,
    'Aprovado'
  ),
  -- João: Pronaf Investimento em análise
  (
    'a2000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000002',
    'c1000000-0000-0000-0000-000000000001',
    'Pronaf Investimento',
    'Sicoob',
    450000.00,
    3.0,
    'Em análise'
  ),
  -- Maria: Pronamp enviado
  (
    'a3000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'c2000000-0000-0000-0000-000000000002',
    'Pronamp',
    'Bradesco',
    620000.00,
    2.0,
    'Enviado'
  ),
  -- Pedro: BNDES Agro com docs pendentes
  (
    'a4000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000002',
    'c3000000-0000-0000-0000-000000000003',
    'BNDES Agro',
    'Banco do Brasil',
    1800000.00,
    1.8,
    'Documentos pendentes'
  ),
  -- Ana: FNE Rural rascunho
  (
    'a5000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000002',
    'c4000000-0000-0000-0000-000000000004',
    'FNE Rural',
    'BNB',
    390000.00,
    2.2,
    'Rascunho'
  ),
  -- Carlos: Pronaf Custeio aprovado (large)
  (
    'a6000000-0000-0000-0000-000000000006',
    'b0000000-0000-0000-0000-000000000002',
    'c5000000-0000-0000-0000-000000000005',
    'Pronaf Custeio',
    'Cresol',
    950000.00,
    2.8,
    'Aprovado'
  )
on conflict (id) do nothing;

-- ── Demo notifications ───────────────────────────────────────
insert into notifications (organization_id, title, body, is_read)
values
  (
    'b0000000-0000-0000-0000-000000000002',
    'Matrícula de João da Silva precisa de revisão',
    'A Matrícula do imóvel foi processada mas tem campos com baixa confiança. Verifique antes de continuar.',
    false
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Documentos pendentes — Maria Costa',
    'Faltam 4 documentos para completar a solicitação Pronamp. Última atividade há 3 dias.',
    false
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Solicitação de Carlos Souza aprovada!',
    'O crédito Pronaf Custeio de R$ 950.000 foi aprovado pelo Cresol. Parabéns!',
    true
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    'Formulário gerado — Pedro Alves',
    'O formulário BNDES Agro foi gerado com sucesso e está pronto para envio ao banco.',
    true
  )
on conflict do nothing;

-- ============================================================
-- After running this SQL, create the demo user in Supabase:
--
-- 1. Go to Authentication → Users → Add user
-- 2. Email: demo@projetista.ai   Password: Demo@2026
-- 3. Then run this to link them to the demo org:
--
--    update profiles
--    set organization_id = 'b0000000-0000-0000-0000-000000000002',
--        full_name = 'Demo Usuário',
--        role = 'admin'
--    where id = (select id from auth.users where email = 'demo@projetista.ai');
--
-- Also update ORG_ID in the app pages to use the demo org when
-- logged in as the demo user (Phase 2+: read org from profiles).
-- ============================================================
