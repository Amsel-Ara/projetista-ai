-- ============================================================
-- Projetista.Ai — Credit Programs, Doc Types & Requirements
-- Source: BB_CreditoRural_Referencia.html (Safra 2025/2026)
-- Run in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. credit_programs ──────────────────────────────────────
-- bank = NULL  → MCR-defined program (Pronaf, Pronamp…) — stored ONCE, valid for all banks
-- bank = 'banco_do_brasil' → BB-proprietary program (non-MCR)

create table if not exists credit_programs (
  id                 uuid        primary key default gen_random_uuid(),
  bank               text,                        -- NULL = MCR (all banks)
  code               text        not null,        -- internal slug: 'pronaf_custeio'
  display_name       text        not null,        -- UI label: 'Pronaf Custeio'
  category           text        not null check (category in ('custeio','investimento','fundiario')),
  eligibility        text,
  purpose            text,
  interest_rate_min  numeric(5,2),
  interest_rate_max  numeric(5,2),
  credit_limit_text  text,
  term_text          text,
  grace_text         text,
  mcr_chapter        text,
  safra              text        default '2025/2026',
  notes              text,
  constraint credit_programs_unique unique (bank, code)
);

-- ── 2. doc_types ─────────────────────────────────────────────
-- Master catalog of all document types (A1–F3 from BB matrix).
-- Shared across all banks and programs — no duplication.

create table if not exists doc_types (
  doc_key    text    primary key,
  label      text    not null,
  category   text    not null,   -- A=identification B=property C=project D=environmental E=activity F=guarantee
  has_expiry boolean not null default false,
  sort_order integer not null default 0
);

-- ── 3. program_doc_requirements ──────────────────────────────
-- Junction: which doc is needed for which program, at what level.
-- bank = NULL              → requirement from MCR, applies to ALL banks
-- bank = 'banco_do_brasil' → BB-specific addition to this MCR program

create table if not exists program_doc_requirements (
  id             uuid    primary key default gen_random_uuid(),
  program_id     uuid    not null references credit_programs(id) on delete cascade,
  bank           text,            -- NULL = MCR req | 'banco_do_brasil' = BB addition
  doc_key        text    not null references doc_types(doc_key),
  source         text    not null check (source in ('MCR','BB','MCR+BB')),
  required_level text    not null check (required_level in ('mandatory','conditional','not_applicable')),
  notes          text,
  constraint program_doc_req_unique unique (program_id, bank, doc_key)
);

create index if not exists idx_credit_programs_lookup on credit_programs (bank, code);
create index if not exists idx_program_doc_req_lookup on program_doc_requirements (program_id, bank);

-- ── 4. RLS — global reference data, public read ──────────────
alter table credit_programs          enable row level security;
alter table doc_types                enable row level security;
alter table program_doc_requirements enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='credit_programs' and policyname='credit_programs: public read') then
    create policy "credit_programs: public read" on credit_programs for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='doc_types' and policyname='doc_types: public read') then
    create policy "doc_types: public read" on doc_types for select using (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='program_doc_requirements' and policyname='program_doc_requirements: public read') then
    create policy "program_doc_requirements: public read" on program_doc_requirements for select using (true);
  end if;
end $$;

-- ── 5. Extend applications table ─────────────────────────────
alter table applications
  add column if not exists program_code  text,
  add column if not exists doc_checklist jsonb;
-- program_code: slug of the selected credit_program at creation time
-- doc_checklist: JSONB snapshot of resolved checklist (immune to future MCR changes)

-- ════════════════════════════════════════════════════════════
-- SEED DATA — Banco do Brasil, Safra 2025/2026
-- Source: BB_CreditoRural_Referencia.html
-- ════════════════════════════════════════════════════════════

-- ── A. credit_programs — MCR programs (bank = NULL) ──────────

insert into credit_programs (bank, code, display_name, category, eligibility, purpose, interest_rate_min, interest_rate_max, credit_limit_text, term_text, grace_text, mcr_chapter, notes) values

-- PRONAF — CUSTEIO
(null, 'pronaf_custeio',            'Pronaf Custeio',                          'custeio',
 'CAF válido. Renda bruta até R$ 500 mil/ano. Exceto grupos A, A/C e B.',
 'Custeio agrícola e pecuário. Insumos, sementes, defensivos, mão de obra, manutenção.',
 2.00, 3.00, 'Até R$ 250 mil / ano agrícola', '11 meses a 3 anos, conforme ciclo produtivo', null,
 'MCR 10-4', 'Alimentos básicos/orgânicos: 2% a.a. Demais culturas: 3% a.a. ZARC obrigatório 2025/26.'),

(null, 'pronaf_custeio_sociobio',   'Pronaf Custeio — Sociobiodiversidade',    'custeio',
 'CAF válido. Produtos da sociobiodiversidade (babaçu, açaí, castanha, licuri etc.)',
 'Custeio de atividades extrativistas e de bioeconomia.',
 2.00, 2.00, 'Até R$ 250 mil', 'Até 2 anos', null,
 'MCR 10', null),

(null, 'pronaf_custeio_agroeco',    'Pronaf Custeio — Agroecológico/Orgânico', 'custeio',
 'CAF válido. Produção agroecológica certificada ou em transição.',
 'Custeio de sistemas orgânicos e agroecológicos.',
 2.00, 2.00, 'Até R$ 250 mil', 'Até 2 anos', null,
 'MCR 10', null),

-- PRONAF — INVESTIMENTO
(null, 'pronaf_mais_alimentos',     'Pronaf Mais Alimentos',                   'investimento',
 'CAF válido. Exceto grupos A, A/C e B. Renda até R$ 500 mil/ano.',
 'Implantação, ampliação ou modernização de estrutura produtiva. Máquinas, equipamentos, armazenagem, infraestrutura.',
 2.50, 3.00,
 'Até R$ 250 mil (até R$ 450 mil: suinocultura, avicultura, aquicultura, carcinicultura, fruticultura)',
 'Até 10 anos', 'Carência até 3 anos conforme projeto',
 'MCR 10-4 / BB Portal', null),

(null, 'pronaf_agroecologia',       'Pronaf Agroecologia',                     'investimento',
 'CAF válido. Sistemas orgânicos ou agroecológicos certificados.',
 'Investimentos em infraestrutura para produção agroecológica.',
 3.00, 3.00, 'Até R$ 250 mil', 'Até 10 anos', 'Carência até 3 anos',
 'MCR 10', null),

(null, 'pronaf_floresta',           'Pronaf Floresta',                         'investimento',
 'CAF válido. Agricultores familiares.',
 'Sistemas agroflorestais (SAF), recuperação de APP e Reserva Legal, silvicultura.',
 3.00, 3.00, 'Até R$ 120 mil (SAF)', 'Até 12 anos', 'Carência até 8 anos',
 'MCR 10-7', null),

(null, 'pronaf_semiarido',          'Pronaf Semiárido',                        'investimento',
 'CAF válido. Produtores no semiárido e polígono da seca.',
 'Irrigação, cisternas, convivência com o semiárido, energia solar, adaptação climática.',
 3.00, 3.00, 'Até R$ 250 mil', 'Até 10 anos', 'Carência até 3 anos',
 'MCR 10-8', null),

(null, 'pronaf_mulher',             'Pronaf Mulher',                           'investimento',
 'Agricultoras com CAF válido. Renda familiar até R$ 100 mil/ano.',
 'Qualquer investimento produtivo no estabelecimento.',
 3.00, 3.00, 'Até R$ 250 mil', 'Até 10 anos', 'Carência até 3 anos',
 'MCR 10', null),

(null, 'pronaf_jovem',              'Pronaf Jovem',                            'investimento',
 'CAF válido. Jovens de 16 a 29 anos. Comprovação de conclusão/frequência em curso técnico.',
 'Construção, reformas, máquinas, equipamentos, animais, formação de pastagem, energia.',
 3.00, 3.00, 'Até R$ 250 mil', 'Até 10 anos', 'Carência até 3 anos',
 'MCR 10 / BB Portal', null),

(null, 'pronaf_agroindustria',      'Pronaf Agroindústria',                    'investimento',
 'CAF válido. Mín. 80% da produção beneficiada deve ser própria. Cooperativas: mín. 75% sócios com CAF.',
 'Beneficiamento, armazenagem, processamento, comercialização da produção familiar.',
 4.00, 5.50, 'Até R$ 250 mil (individual) / até R$ 35 milhões (cooperativa)',
 'Até 10 anos', 'Carência até 3 anos',
 'MCR 10-6', 'Cooperativas com 60–74% CAF: +1,5 p.p.'),

(null, 'pronaf_grupo_b',            'Pronaf Grupo B — Microcrédito',           'investimento',
 'CAF Grupo B. Renda bruta familiar anual até R$ 50 mil.',
 'Investimentos básicos. Implantação, ampliação de infraestrutura de produção e serviços.',
 0.50, 0.50, 'R$ 12 mil (com PNMPO) / R$ 4 mil (sem PNMPO)',
 'Custeio: 2 anos. Investimento: 3 anos', null,
 'MCR 10', 'Bônus de 25–40% por adimplência.'),

-- PRONAF — FUNDIÁRIO
(null, 'pronaf_credito_fundiario',  'Pronaf Crédito Fundiário',                'fundiario',
 'Trabalhadores sem terra, posseiros, arrendatários, minifundiários. CAF ou análise ATER.',
 'Aquisição de imóvel rural, benfeitorias, georreferenciamento, regularização fundiária.',
 0.50, 2.50, 'Conforme avaliação da UTE', 'Até 25 anos', 'Carência 36 meses',
 'PNCF / BB Portal', 'PNCF Social: 0,5% a.a. PNCF Mais: 2,5% a.a.'),

-- PRONAMP
(null, 'pronamp_custeio',           'Pronamp Custeio',                         'custeio',
 'Renda bruta anual até R$ 3,5 milhões. Mín. 80% da RBA de atividade agropecuária. Proprietários, posseiros, arrendatários, parceiros, comodatários.',
 'Despesas do ciclo produtivo agrícola e pecuário. Insumos, mão de obra, combustível, manutenção de máquinas.',
 8.00, 8.00, 'Até R$ 1,5 milhão / ano agrícola',
 'Até 2 anos conforme ciclo', null,
 'MCR 8 / BB Portal', 'Limite de renda ampliado para R$ 3,5 mi/ano na Safra 2025/26 (era R$ 3,0 mi).'),

(null, 'pronamp_investimento',      'Pronamp Investimento',                    'investimento',
 'Mesmas condições do Pronamp Custeio.',
 'Construções, reformas, benfeitorias; irrigação; reflorestamento; formação de pastagens e lavouras permanentes; eletrificação rural; máquinas e equipamentos; correção e recuperação do solo.',
 8.00, 10.50, 'Até R$ 430 mil / ano agrícola (100% do valor do investimento)',
 'Até 8 anos com recursos equalizados', 'Carência até 3 anos. Parcelas semestrais ou anuais.',
 'MCR 8 / BB Portal', 'Bens em garantia devem estar obrigatoriamente segurados.')

on conflict (bank, code) do nothing;

-- ── B. credit_programs — BB-proprietary programs ─────────────

insert into credit_programs (bank, code, display_name, category, eligibility, purpose, interest_rate_min, interest_rate_max, credit_limit_text, term_text, grace_text, mcr_chapter, notes) values

('banco_do_brasil', 'bb_moderfrota',  'Moderfrota',    'investimento',
 'Médios e grandes produtores. Pessoas físicas ou jurídicas.',
 'Aquisição de tratores, colheitadeiras, pulverizadores, plantadeiras, implementos novos.',
 11.50, 11.50, 'Conforme projeto', 'Até 7 anos', 'Conforme projeto',
 'MCR 11-5 / BNDES', null),

('banco_do_brasil', 'bb_inovagro',    'Inovagro',      'investimento',
 'Produtores rurais e cooperativas agropecuárias.',
 'Tecnologia de precisão, automação, energia renovável, rastreabilidade, TIC, capacitação técnica e gerencial.',
 10.50, 12.00, 'Conforme projeto', 'Até 10 anos', 'Carência até 3 anos',
 'MCR 11-8', null),

('banco_do_brasil', 'bb_renovagro',   'RenovAgro',     'investimento',
 'Produtores rurais e cooperativas. Propriedades com CAR ativo.',
 'Recuperação de pastagens, sistemas integrados (ILPF), plantio direto, agricultura orgânica, bioinsumos, reflorestamento.',
 10.50, 10.50, 'Conforme projeto', 'Até 12 anos', 'Carência até 8 anos',
 'MCR 11-7 (ex-ABC)', 'Desconto 0,5 p.p. com CAR regularizado.'),

('banco_do_brasil', 'bb_proirriga',   'Proirriga',     'investimento',
 'Produtores rurais e cooperativas.',
 'Implantação, ampliação e modernização de sistemas de irrigação. Cultivo protegido.',
 10.50, 12.00, 'Conforme projeto', 'Até 12 anos', 'Carência até 3 anos',
 'MCR 11-3', null),

('banco_do_brasil', 'bb_pca',         'PCA — Armazéns','investimento',
 'Produtores rurais, cooperativas, empresas armazenadoras.',
 'Construção, ampliação e reforma de unidades armazenadoras de grãos, frutas, tubérculos, fibras.',
 10.50, 10.50, 'Conforme projeto', 'Até 15 anos', 'Carência até 3 anos',
 'MCR 11', null),

('banco_do_brasil', 'bb_moderagro',   'Moderagro',     'investimento',
 'Produtores rurais e cooperativas agropecuárias.',
 'Recuperação de solos, proteção de animais, rastreabilidade, infraestrutura produtiva, modernização de instalações.',
 10.50, 12.00, 'Conforme projeto', 'Até 10 anos', 'Carência até 3 anos',
 'MCR 11', null)

on conflict (bank, code) do nothing;


-- ════════════════════════════════════════════════════════════
-- SEED — doc_types (24 documents, categories A–F)
-- Source: Section 4 matrix of BB_CreditoRural_Referencia.html
-- ════════════════════════════════════════════════════════════

insert into doc_types (doc_key, label, category, has_expiry, sort_order) values

-- A — IDENTIFICAÇÃO DO PROPONENTE
('rg_cpf',              'RG e CPF do proponente (e cônjuge se comunhão)',                     'A', false, 10),
('comprov_residencia',  'Comprovante de residência',                                           'A', false, 20),
('caf',                 'CAF — Cadastro Nacional da Agricultura Familiar (ex-DAP)',           'A', true,  30),
('decl_renda_pronamp',  'Declaração de renda bruta agropecuária (Pronamp)',                   'A', false, 40),
('certidao_casamento',  'Certidão de casamento / regime de bens',                             'A', false, 50),

-- B — IMÓVEL / PROPRIEDADE RURAL
('matricula',           'Matrícula atualizada do imóvel (CRI)',                               'B', true,  110),
('ccir',                'CCIR — Certificado de Cadastro do Imóvel Rural (quitado)',           'B', true,  120),
('itr',                 'ITR — Imposto Territorial Rural (últimos 5 anos)',                   'B', true,  130),
('car',                 'CAR — Cadastro Ambiental Rural (status ativo ou pendente)',          'B', false, 140),
('gleba_kml',           'Gleba — arquivo KML ou GeoMapa Rural BB',                           'B', false, 150),
('certidao_onus',       'Certidão de inexistência de ônus (CRI)',                             'B', false, 160),
('contrato_arrendamento','Contrato de arrendamento / Carta de Anuência do proprietário',     'B', true,  170),
('concordancia_condominios','Concordância de condôminos (condomínio pró-indiviso)',           'B', false, 180),
('concordancia_usufrutuario','Concordância do usufrutuário',                                 'B', false, 190),

-- C — PROJETO TÉCNICO / PROPOSTA
('projeto_tecnico',     'Projeto técnico elaborado por profissional habilitado (CREA/CFA)',  'C', false, 210),
('art',                 'ART — Anotação de Responsabilidade Técnica do projeto',             'C', false, 220),
('analise_solo',        'Análise de solo',                                                    'C', true,  230),
('zarc',                'Declaração do ZARC (Zoneamento Agrícola de Risco Climático)',       'C', false, 240),
('orcamentos_fornecedores','Orçamentos de fornecedores (3 orçamentos ou NF proforma)',       'C', false, 250),

-- D — DOCUMENTAÇÃO AMBIENTAL
('licenca_ambiental',   'Licença Ambiental ou Dispensa (LP/LI/LO)',                          'D', true,  310),
('outorga_agua',        'Outorga d''água ou cadastro de uso insignificante',                 'D', true,  320),
('reserva_legal',       'Comprovação de Reserva Legal averbada / inscrita no CAR',           'D', false, 330),
('autorizacao_ambiental','Autorização do órgão ambiental para incorporação de novas áreas', 'D', false, 340),

-- E — ESPECÍFICOS POR ATIVIDADE
('ficha_sanitaria',     'Ficha sanitária do rebanho vendedor',                               'E', true,  410),
('laudo_equipamentos',  'Laudo técnico de avaliação de equipamentos usados',                 'E', false, 420),
('decl_cana_acucar',    'Declaração de financiamento de cana-de-açúcar',                    'E', false, 430),
('concordancia_investimento_terceiros','Concordância formal para investimentos fixos em imóveis de terceiros','E', false, 440),

-- F — GARANTIAS
('apolice_seguro',      'Apólice de seguro dos bens em garantia',                            'F', true,  510),
('adesao_proagro',      'Adesão ao PROAGRO ou PROAGRO Mais',                                'F', false, 520),
('decl_financiamentos', 'Declaração de inexistência / existência de financiamentos "em ser"','F', false, 530)

on conflict (doc_key) do nothing;


-- ════════════════════════════════════════════════════════════
-- SEED — program_doc_requirements
-- Full matrix: 4 program variants × all applicable docs
-- source:         MCR | BB | MCR+BB
-- required_level: mandatory | conditional | not_applicable
-- bank = NULL     → MCR requirement (all banks)
-- bank = 'banco_do_brasil' → BB-specific addition to MCR program
-- ════════════════════════════════════════════════════════════

-- Helper: resolve program IDs by code
-- (Using a DO block to avoid repetition)

do $$
declare
  p_pronaf_custeio      uuid;
  p_pronaf_inv          uuid;
  p_pronamp_custeio     uuid;
  p_pronamp_inv         uuid;
begin
  select id into p_pronaf_custeio  from credit_programs where code = 'pronaf_custeio'       and bank is null;
  select id into p_pronaf_inv      from credit_programs where code = 'pronaf_mais_alimentos' and bank is null;
  select id into p_pronamp_custeio from credit_programs where code = 'pronamp_custeio'       and bank is null;
  select id into p_pronamp_inv     from credit_programs where code = 'pronamp_investimento'  and bank is null;

  -- ── A — IDENTIFICAÇÃO ──────────────────────────────────

  -- A1: RG e CPF — MCR+BB, mandatory for all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'rg_cpf', 'MCR+BB', 'mandatory',    'Cônjuge também quando regime de comunhão.'),
    (p_pronaf_inv,      null, 'rg_cpf', 'MCR+BB', 'mandatory',    'Cônjuge também quando regime de comunhão.'),
    (p_pronamp_custeio, null, 'rg_cpf', 'MCR+BB', 'mandatory',    'Cônjuge também quando regime de comunhão.'),
    (p_pronamp_inv,     null, 'rg_cpf', 'MCR+BB', 'mandatory',    'Cônjuge também quando regime de comunhão.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- A2: Comprovante de residência — BB only, mandatory for all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level) values
    (p_pronaf_custeio,  'banco_do_brasil', 'comprov_residencia', 'BB', 'mandatory'),
    (p_pronaf_inv,      'banco_do_brasil', 'comprov_residencia', 'BB', 'mandatory'),
    (p_pronamp_custeio, 'banco_do_brasil', 'comprov_residencia', 'BB', 'mandatory'),
    (p_pronamp_inv,     'banco_do_brasil', 'comprov_residencia', 'BB', 'mandatory')
  on conflict (program_id, bank, doc_key) do nothing;

  -- A3: CAF — MCR+BB, mandatory Pronaf only, not applicable Pronamp
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'caf', 'MCR+BB',         'mandatory',      'Substituiu a DAP em 2025 (Portaria MDA 19/2025).'),
    (p_pronaf_inv,      null, 'caf', 'MCR+BB',         'mandatory',      'Substituiu a DAP em 2025 (Portaria MDA 19/2025).'),
    (p_pronamp_custeio, null, 'caf', 'MCR+BB',         'not_applicable', 'Pronamp não exige CAF.'),
    (p_pronamp_inv,     null, 'caf', 'MCR+BB',         'not_applicable', 'Pronamp não exige CAF.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- A4: Declaração de renda — MCR+BB, mandatory Pronamp only
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'decl_renda_pronamp', 'MCR+BB', 'not_applicable', null),
    (p_pronaf_inv,      null, 'decl_renda_pronamp', 'MCR+BB', 'not_applicable', null),
    (p_pronamp_custeio, null, 'decl_renda_pronamp', 'MCR+BB', 'mandatory',      'Comprovar ≥ 80% renda bruta agropecuária e renda ≤ R$ 3,5 mi.'),
    (p_pronamp_inv,     null, 'decl_renda_pronamp', 'MCR+BB', 'mandatory',      'Comprovar ≥ 80% renda bruta agropecuária e renda ≤ R$ 3,5 mi.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- A5: Certidão de casamento — BB, conditional (quando casado)
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'certidao_casamento', 'BB', 'conditional', 'Quando casado. Cônjuge deve assinar contrato em comunhão parcial ou universal.'),
    (p_pronaf_inv,      'banco_do_brasil', 'certidao_casamento', 'BB', 'conditional', 'Quando casado. Cônjuge deve assinar contrato em comunhão parcial ou universal.'),
    (p_pronamp_custeio, 'banco_do_brasil', 'certidao_casamento', 'BB', 'conditional', 'Quando casado. Cônjuge deve assinar contrato em comunhão parcial ou universal.'),
    (p_pronamp_inv,     'banco_do_brasil', 'certidao_casamento', 'BB', 'conditional', 'Quando casado. Cônjuge deve assinar contrato em comunhão parcial ou universal.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- ── B — IMÓVEL ─────────────────────────────────────────

  -- B1: Matrícula — MCR+BB, mandatory all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'matricula', 'MCR+BB', 'mandatory', 'BB Pronaf: emitida há menos de 30 dias.'),
    (p_pronaf_inv,      null, 'matricula', 'MCR+BB', 'mandatory', 'BB Pronaf: emitida há menos de 30 dias.'),
    (p_pronamp_custeio, null, 'matricula', 'MCR+BB', 'mandatory', 'BB Pronamp: emitida há menos de 60 dias, com cadeia dominial dos últimos 15 anos.'),
    (p_pronamp_inv,     null, 'matricula', 'MCR+BB', 'mandatory', 'BB Pronamp: emitida há menos de 60 dias, com cadeia dominial dos últimos 15 anos.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- B2: CCIR — MCR+BB, mandatory all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'ccir', 'MCR+BB', 'mandatory', 'Deve estar quitado e vigente.'),
    (p_pronaf_inv,      null, 'ccir', 'MCR+BB', 'mandatory', 'Deve estar quitado e vigente.'),
    (p_pronamp_custeio, null, 'ccir', 'MCR+BB', 'mandatory', 'Deve estar quitado e vigente.'),
    (p_pronamp_inv,     null, 'ccir', 'MCR+BB', 'mandatory', 'Deve estar quitado e vigente.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- B3: ITR — MCR+BB, mandatory all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'itr', 'MCR+BB', 'mandatory', 'DITR ou DIAT dos últimos 5 anos com comprovante de pagamento.'),
    (p_pronaf_inv,      null, 'itr', 'MCR+BB', 'mandatory', 'DITR ou DIAT dos últimos 5 anos com comprovante de pagamento.'),
    (p_pronamp_custeio, null, 'itr', 'MCR+BB', 'mandatory', 'DITR ou DIAT dos últimos 5 anos com comprovante de pagamento.'),
    (p_pronamp_inv,     null, 'itr', 'MCR+BB', 'mandatory', 'DITR ou DIAT dos últimos 5 anos com comprovante de pagamento.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- B4: CAR — MCR+BB, mandatory all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'car', 'MCR+BB', 'mandatory', 'CAR ativo garante desconto 0,5 p.p. CAR cancelado/suspenso: crédito NEGADO.'),
    (p_pronaf_inv,      null, 'car', 'MCR+BB', 'mandatory', 'CAR ativo garante desconto 0,5 p.p. CAR cancelado/suspenso: crédito NEGADO.'),
    (p_pronamp_custeio, null, 'car', 'MCR+BB', 'mandatory', 'CAR ativo garante desconto 0,5 p.p. CAR cancelado/suspenso: crédito NEGADO.'),
    (p_pronamp_inv,     null, 'car', 'MCR+BB', 'mandatory', 'CAR ativo garante desconto 0,5 p.p. CAR cancelado/suspenso: crédito NEGADO.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- B5: Gleba KML — BB only, mandatory all (BB-specific requirement)
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'gleba_kml', 'BB', 'mandatory', 'Coordenadas da área financiada via app GeoMapa Rural BB. Obrigatório para todos os custeios agrícolas.'),
    (p_pronaf_inv,      'banco_do_brasil', 'gleba_kml', 'BB', 'mandatory', 'Coordenadas da área financiada via app GeoMapa Rural BB.'),
    (p_pronamp_custeio, 'banco_do_brasil', 'gleba_kml', 'BB', 'mandatory', 'Coordenadas da área financiada via app GeoMapa Rural BB.'),
    (p_pronamp_inv,     'banco_do_brasil', 'gleba_kml', 'BB', 'mandatory', 'Coordenadas da área financiada via app GeoMapa Rural BB.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- B6: Certidão de ônus — BB Pronamp mandatory, Pronaf Inv conditional
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'certidao_onus', 'BB', 'not_applicable', null),
    (p_pronaf_inv,      'banco_do_brasil', 'certidao_onus', 'BB', 'conditional',    'Quando bens da garantia estão fixados ou removíveis do imóvel.'),
    (p_pronamp_custeio, 'banco_do_brasil', 'certidao_onus', 'BB', 'mandatory',      'Exigida pelo BB para Pronamp.'),
    (p_pronamp_inv,     'banco_do_brasil', 'certidao_onus', 'BB', 'mandatory',      'Exigida pelo BB para Pronamp.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- B7: Contrato de arrendamento — MCR+BB, conditional all (quando imóvel não é próprio)
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'contrato_arrendamento', 'MCR+BB', 'conditional', 'Quando o imóvel explorado não é próprio. Deve incluir prazo, condições e área.'),
    (p_pronaf_inv,      null, 'contrato_arrendamento', 'MCR+BB', 'conditional', 'Quando o imóvel explorado não é próprio. Deve incluir prazo, condições e área.'),
    (p_pronamp_custeio, null, 'contrato_arrendamento', 'MCR+BB', 'conditional', 'Quando o imóvel explorado não é próprio. Deve incluir prazo, condições e área.'),
    (p_pronamp_inv,     null, 'contrato_arrendamento', 'MCR+BB', 'conditional', 'Quando o imóvel explorado não é próprio. Deve incluir prazo, condições e área.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- B8: Concordância condôminos — BB Checklist, conditional all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'concordancia_condominios', 'BB', 'conditional', 'Quando imóvel em estado de indivisão (co-proprietários).'),
    (p_pronaf_inv,      'banco_do_brasil', 'concordancia_condominios', 'BB', 'conditional', 'Quando imóvel em estado de indivisão (co-proprietários).'),
    (p_pronamp_custeio, 'banco_do_brasil', 'concordancia_condominios', 'BB', 'conditional', 'Quando imóvel em estado de indivisão (co-proprietários).'),
    (p_pronamp_inv,     'banco_do_brasil', 'concordancia_condominios', 'BB', 'conditional', 'Quando imóvel em estado de indivisão (co-proprietários).')
  on conflict (program_id, bank, doc_key) do nothing;

  -- B9: Concordância usufrutuário — BB Checklist, conditional all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'concordancia_usufrutuario', 'BB', 'conditional', 'Quando imóvel tem reserva de usufruto.'),
    (p_pronaf_inv,      'banco_do_brasil', 'concordancia_usufrutuario', 'BB', 'conditional', 'Quando imóvel tem reserva de usufruto.'),
    (p_pronamp_custeio, 'banco_do_brasil', 'concordancia_usufrutuario', 'BB', 'conditional', 'Quando imóvel tem reserva de usufruto.'),
    (p_pronamp_inv,     'banco_do_brasil', 'concordancia_usufrutuario', 'BB', 'conditional', 'Quando imóvel tem reserva de usufruto.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- ── C — PROJETO TÉCNICO ────────────────────────────────

  -- C1: Projeto técnico — MCR+BB, mandatory all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'projeto_tecnico', 'MCR+BB', 'mandatory', 'Custeio: Plano Simples ou Proposta. Investimento: Projeto técnico completo com viabilidade econômica. ART obrigatória.'),
    (p_pronaf_inv,      null, 'projeto_tecnico', 'MCR+BB', 'mandatory', 'Projeto técnico completo com viabilidade econômica. ART obrigatória.'),
    (p_pronamp_custeio, null, 'projeto_tecnico', 'MCR+BB', 'mandatory', 'Custeio: Plano Simples ou Proposta. ART obrigatória.'),
    (p_pronamp_inv,     null, 'projeto_tecnico', 'MCR+BB', 'mandatory', 'Projeto técnico completo com viabilidade econômica. ART obrigatória.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- C2: ART — MCR+BB, mandatory all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'art', 'MCR+BB', 'mandatory', 'Assinada pelo responsável técnico (agrônomo ou técnico agrícola habilitado).'),
    (p_pronaf_inv,      null, 'art', 'MCR+BB', 'mandatory', 'Assinada pelo responsável técnico (agrônomo ou técnico agrícola habilitado).'),
    (p_pronamp_custeio, null, 'art', 'MCR+BB', 'mandatory', 'Assinada pelo responsável técnico (agrônomo ou técnico agrícola habilitado).'),
    (p_pronamp_inv,     null, 'art', 'MCR+BB', 'mandatory', 'Assinada pelo responsável técnico (agrônomo ou técnico agrícola habilitado).')
  on conflict (program_id, bank, doc_key) do nothing;

  -- C3: Análise de solo — mandatory for investimento, conditional for custeio
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'analise_solo', 'MCR+BB', 'conditional', 'Essencial quando custeio inclui insumos de correção e fertilizantes.'),
    (p_pronaf_inv,      null, 'analise_solo', 'MCR+BB', 'mandatory',   'Obrigatória para investimento.'),
    (p_pronamp_custeio, null, 'analise_solo', 'MCR+BB', 'conditional', 'Essencial quando custeio inclui insumos de correção e fertilizantes.'),
    (p_pronamp_inv,     null, 'analise_solo', 'MCR+BB', 'mandatory',   'Obrigatória para investimento.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- C4: ZARC — MCR+MAPA, mandatory for custeio only (novo 2025/26)
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'zarc', 'MCR+BB', 'mandatory',      'NOVO 2025/26: Todo custeio agrícola deve observar o ZARC. Plantio fora da janela pode resultar em negativa.'),
    (p_pronaf_inv,      null, 'zarc', 'MCR+BB', 'not_applicable', null),
    (p_pronamp_custeio, null, 'zarc', 'MCR+BB', 'mandatory',      'NOVO 2025/26: Todo custeio agrícola deve observar o ZARC.'),
    (p_pronamp_inv,     null, 'zarc', 'MCR+BB', 'not_applicable', null)
  on conflict (program_id, bank, doc_key) do nothing;

  -- C5: Orçamentos fornecedores — BB, mandatory investimento only
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'orcamentos_fornecedores', 'BB', 'not_applicable', null),
    (p_pronaf_inv,      'banco_do_brasil', 'orcamentos_fornecedores', 'BB', 'mandatory',      '3 orçamentos ou NF proforma para máquinas, equipamentos e materiais de construção.'),
    (p_pronamp_custeio, 'banco_do_brasil', 'orcamentos_fornecedores', 'BB', 'not_applicable', null),
    (p_pronamp_inv,     'banco_do_brasil', 'orcamentos_fornecedores', 'BB', 'mandatory',      '3 orçamentos ou NF proforma para máquinas, equipamentos e materiais de construção.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- ── D — AMBIENTAL ──────────────────────────────────────

  -- D1: Licença ambiental — MCR+BB, conditional all (depende da atividade)
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'licenca_ambiental', 'MCR+BB', 'conditional', 'Quando atividade financiada requer licenciamento (suinocultura, avicultura, irrigação, agroindústria).'),
    (p_pronaf_inv,      null, 'licenca_ambiental', 'MCR+BB', 'conditional', 'Quando atividade financiada requer licenciamento (suinocultura, avicultura, irrigação, agroindústria).'),
    (p_pronamp_custeio, null, 'licenca_ambiental', 'MCR+BB', 'conditional', 'Quando atividade financiada requer licenciamento.'),
    (p_pronamp_inv,     null, 'licenca_ambiental', 'MCR+BB', 'conditional', 'Quando atividade financiada requer licenciamento.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- D2: Outorga d'água — BB+MCR, conditional all (quando usa recursos hídricos)
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'outorga_agua', 'MCR+BB', 'conditional', 'Quando investimento utiliza recursos hídricos (irrigação, piscicultura, suinocultura).'),
    (p_pronaf_inv,      null, 'outorga_agua', 'MCR+BB', 'conditional', 'Quando investimento utiliza recursos hídricos.'),
    (p_pronamp_custeio, null, 'outorga_agua', 'MCR+BB', 'conditional', 'Quando investimento utiliza recursos hídricos.'),
    (p_pronamp_inv,     null, 'outorga_agua', 'MCR+BB', 'conditional', 'Quando investimento utiliza recursos hídricos.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- D3: Reserva legal — mandatory investimento, conditional custeio
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'reserva_legal', 'MCR+BB', 'conditional', 'BB exige comprovação de RL averbada ou inscrição no CAR. Dispensada se inscrição no CAR já constar.'),
    (p_pronaf_inv,      null, 'reserva_legal', 'MCR+BB', 'mandatory',   'BB exige comprovação de RL averbada ou inscrição no CAR.'),
    (p_pronamp_custeio, null, 'reserva_legal', 'MCR+BB', 'conditional', 'BB exige comprovação de RL averbada ou inscrição no CAR.'),
    (p_pronamp_inv,     null, 'reserva_legal', 'MCR+BB', 'mandatory',   'BB exige comprovação de RL averbada ou inscrição no CAR.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- D4: Autorização ambiental — BB Checklist, conditional investimento only
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'autorizacao_ambiental', 'BB', 'not_applicable', null),
    (p_pronaf_inv,      'banco_do_brasil', 'autorizacao_ambiental', 'BB', 'conditional',    'Quando investimento prevê abertura/incorporação de novas áreas ao processo produtivo.'),
    (p_pronamp_custeio, 'banco_do_brasil', 'autorizacao_ambiental', 'BB', 'not_applicable', null),
    (p_pronamp_inv,     'banco_do_brasil', 'autorizacao_ambiental', 'BB', 'conditional',    'Quando investimento prevê abertura/incorporação de novas áreas ao processo produtivo.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- ── E — ESPECÍFICOS POR ATIVIDADE ──────────────────────

  -- E1: Ficha sanitária — BB Checklist Pronaf Inv, conditional investimento only
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'ficha_sanitaria', 'BB', 'not_applicable', null),
    (p_pronaf_inv,      'banco_do_brasil', 'ficha_sanitaria', 'BB', 'conditional',    'Aquisição de bovinos e bubalinos. Emitida por órgão estadual. Validade máxima: 1 ano antes da proposta.'),
    (p_pronamp_custeio, 'banco_do_brasil', 'ficha_sanitaria', 'BB', 'not_applicable', null),
    (p_pronamp_inv,     'banco_do_brasil', 'ficha_sanitaria', 'BB', 'conditional',    'Aquisição de bovinos e bubalinos. Emitida por órgão estadual. Validade máxima: 1 ano antes da proposta.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- E2: Laudo equipamentos usados — BB Checklist, conditional investimento only
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'laudo_equipamentos', 'BB', 'not_applicable', null),
    (p_pronaf_inv,      'banco_do_brasil', 'laudo_equipamentos', 'BB', 'conditional',    'Máquinas/equipamentos usados de outro produtor BB. Atestar fabricação nacional, funcionamento, conservação, vida útil e valor venal.'),
    (p_pronamp_custeio, 'banco_do_brasil', 'laudo_equipamentos', 'BB', 'not_applicable', null),
    (p_pronamp_inv,     'banco_do_brasil', 'laudo_equipamentos', 'BB', 'conditional',    'Máquinas/equipamentos usados de outro produtor BB. Atestar fabricação nacional, funcionamento, conservação, vida útil e valor venal.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- E3: Declaração cana-de-açúcar — BB Checklist, conditional all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'decl_cana_acucar', 'BB', 'conditional', 'Obrigatória para financiamentos de plantio, renovação ou custeio de cana destinada a etanol, biocombustíveis ou açúcar.'),
    (p_pronaf_inv,      'banco_do_brasil', 'decl_cana_acucar', 'BB', 'conditional', 'Obrigatória para financiamentos de plantio, renovação ou custeio de cana.'),
    (p_pronamp_custeio, 'banco_do_brasil', 'decl_cana_acucar', 'BB', 'conditional', 'Obrigatória para financiamentos de plantio, renovação ou custeio de cana.'),
    (p_pronamp_inv,     'banco_do_brasil', 'decl_cana_acucar', 'BB', 'conditional', 'Obrigatória para financiamentos de plantio, renovação ou custeio de cana.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- E4: Concordância investimentos em imóveis de terceiros — BB Checklist, conditional investimento
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'concordancia_investimento_terceiros', 'BB', 'not_applicable', null),
    (p_pronaf_inv,      'banco_do_brasil', 'concordancia_investimento_terceiros', 'BB', 'conditional',    'Quando investimento fixo é realizado em imóvel de terceiro ou explorado em regime de parceria.'),
    (p_pronamp_custeio, 'banco_do_brasil', 'concordancia_investimento_terceiros', 'BB', 'not_applicable', null),
    (p_pronamp_inv,     'banco_do_brasil', 'concordancia_investimento_terceiros', 'BB', 'conditional',    'Quando investimento fixo é realizado em imóvel de terceiro ou explorado em regime de parceria.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- ── F — GARANTIAS ──────────────────────────────────────

  -- F1: Apólice de seguro — BB, mandatory Pronamp Inv, conditional others
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  'banco_do_brasil', 'apolice_seguro', 'BB', 'conditional', 'Recomendado. Pode ser contratado no próprio BB.'),
    (p_pronaf_inv,      'banco_do_brasil', 'apolice_seguro', 'BB', 'conditional', 'Recomendado para bens em garantia.'),
    (p_pronamp_custeio, 'banco_do_brasil', 'apolice_seguro', 'BB', 'not_applicable', null),
    (p_pronamp_inv,     'banco_do_brasil', 'apolice_seguro', 'BB', 'mandatory',   'Pronamp Investimento: bens em garantia DEVEM obrigatoriamente estar segurados. BB oferece o seguro.')
  on conflict (program_id, bank, doc_key) do nothing;

  -- F2: Adesão PROAGRO — MCR+BB, conditional custeio only
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'adesao_proagro', 'MCR+BB', 'conditional',    'Obrigatório para Pronaf Grupo B (PROAGRO Mais). Recomendado demais custeios. ZARC obrigatório para aderir 2025/26.'),
    (p_pronaf_inv,      null, 'adesao_proagro', 'MCR+BB', 'not_applicable', null),
    (p_pronamp_custeio, null, 'adesao_proagro', 'MCR+BB', 'conditional',    'Recomendado para custeio Pronamp. ZARC obrigatório para aderir 2025/26.'),
    (p_pronamp_inv,     null, 'adesao_proagro', 'MCR+BB', 'not_applicable', null)
  on conflict (program_id, bank, doc_key) do nothing;

  -- F3: Declaração financiamentos — MCR, mandatory all
  insert into program_doc_requirements (program_id, bank, doc_key, source, required_level, notes) values
    (p_pronaf_custeio,  null, 'decl_financiamentos', 'MCR', 'mandatory', 'MCR exige declaração sobre todos os financiamentos em aberto no SNCR. Declaração falsa = desclassificação.'),
    (p_pronaf_inv,      null, 'decl_financiamentos', 'MCR', 'mandatory', 'MCR exige declaração sobre todos os financiamentos em aberto no SNCR.'),
    (p_pronamp_custeio, null, 'decl_financiamentos', 'MCR', 'mandatory', 'MCR exige declaração sobre todos os financiamentos em aberto no SNCR.'),
    (p_pronamp_inv,     null, 'decl_financiamentos', 'MCR', 'mandatory', 'MCR exige declaração sobre todos os financiamentos em aberto no SNCR.')
  on conflict (program_id, bank, doc_key) do nothing;

end $$;
