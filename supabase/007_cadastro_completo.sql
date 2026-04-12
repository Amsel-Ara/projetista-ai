-- ════════════════════════════════════════════════════════════════
-- Migration 007 — Cadastro Completo (Master Client Record)
-- ════════════════════════════════════════════════════════════════
-- Implements the full BB loan-application data model across 7
-- Cadastro sections derived from analysis of:
--   • CADASTRO DE PRODUÇÃO.xlsx
--   • Roteiro Elaboração de Projetos ANEXOS.xlsx
--   • Projeto_INOVAGRO.xls
--   • BB Modelo Laudo Técnico - Op. Custeio.xlsx
--   • Planilha Evolução de Rebanho.xlsx
-- ════════════════════════════════════════════════════════════════


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 1 — IDENTIFICAÇÃO (extend existing clients table)  ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE clients
  -- Spouse / conjugal data
  ADD COLUMN IF NOT EXISTS nome_conjuge        text,
  ADD COLUMN IF NOT EXISTS cpf_conjuge         text,
  -- BB agency / operational
  ADD COLUMN IF NOT EXISTS agencia             text,
  ADD COLUMN IF NOT EXISTS prefixo             text,
  ADD COLUMN IF NOT EXISTS contador            text;   -- accountant name/contact


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 2 — IMÓVEIS RURAIS (extend rural_properties)       ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE rural_properties
  -- Property registration
  ADD COLUMN IF NOT EXISTS matricula             text,        -- cartório registry number
  ADD COLUMN IF NOT EXISTS distrito_bairro       text,
  ADD COLUMN IF NOT EXISTS latitude              text,        -- stored as DMS string (G,M,S)
  ADD COLUMN IF NOT EXISTS longitude             text,
  ADD COLUMN IF NOT EXISTS local_registro        text,        -- registry office name/location
  -- Ownership & legal
  ADD COLUMN IF NOT EXISTS participacao_pct      numeric(5,2),  -- client's share (%)
  ADD COLUMN IF NOT EXISTS cessao_terceiros      boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS situacao_imovel       text,        -- e.g. Ativo, Arrendado, Hipotecado
  ADD COLUMN IF NOT EXISTS estado_conservacao    text,        -- Bom, Regular, Ruim
  ADD COLUMN IF NOT EXISTS gravame               boolean  DEFAULT false,
  ADD COLUMN IF NOT EXISTS capacidade_uso_solo   text,        -- Soil capability class (I-VIII)
  -- Valuation
  ADD COLUMN IF NOT EXISTS valor_por_hectare     numeric(14,2),
  ADD COLUMN IF NOT EXISTS valor_total_terra_nua numeric(14,2),
  -- Other owners
  ADD COLUMN IF NOT EXISTS outros_proprietarios  text;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 3 — SEMOVENTES (Livestock Inventory)               ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS semoventes (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                   uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,

  -- Animal identification
  especie_tipo                text        NOT NULL,   -- VACA, BOI, BEZERRA, BEZERRO, CAVALO, etc.
  quantidade                  integer     NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  sexo                        text        CHECK (sexo IN ('M', 'F')),
  finalidade                  text,                   -- production purpose code / description
  raca                        text,
  grau_mesticagem             numeric(5,2),           -- crossbreeding degree (0-100%)
  idade_meses                 integer     CHECK (idade_meses >= 0),
  cor_pelagem                 text,

  -- Legal / insurance
  gravame                     boolean     DEFAULT false,
  seguro                      boolean     DEFAULT false,
  situacao_propriedade        text,                   -- Próprio, Arrendado, Comodato, etc.
  participacao_pct            numeric(5,2) DEFAULT 100,

  -- Valuation
  valor_unitario              numeric(14,2),
  valor_total                 numeric(14,2),          -- quantity × unit value (app-computed)

  -- Location
  matricula_imovel_localizacao text,                  -- which property the animals are kept on

  observacoes                 text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Herd technical coefficients (one record per client)
CREATE TABLE IF NOT EXISTS herd_coefficients (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                   uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,

  natalidade_pct              numeric(5,2),
  mortalidade_adultos_pct     numeric(5,2),
  mortalidade_1_2_anos_pct    numeric(5,2),
  mortalidade_bezerros_pct    numeric(5,2),
  descarte_matrizes_pct       numeric(5,2),
  descarte_touros_pct         numeric(5,2),

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (client_id)
);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 4 — BENS MÓVEIS (Equipment & Movable Assets)       ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS movable_assets (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                   uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,

  -- Asset identification
  especie_tipo                text        NOT NULL,   -- Trator, Colheitadeira, Caminhão, etc.
  marca_modelo                text,
  ano_fabricacao              integer     CHECK (ano_fabricacao >= 1900 AND ano_fabricacao <= 2100),
  quantidade                  integer     NOT NULL DEFAULT 1 CHECK (quantidade >= 0),
  estado                      text        CHECK (estado IN ('Novo', 'Bom', 'Regular', 'Ruim')),
  finalidade                  text,

  -- Legal / insurance
  gravame                     boolean     DEFAULT false,
  seguro                      boolean     DEFAULT false,
  participacao_pct            numeric(5,2) DEFAULT 100,

  -- Location & valuation
  localizacao                 text,                   -- property name/matricula where asset is kept
  valor_unitario              numeric(14,2),
  valor_total                 numeric(14,2),          -- app-computed

  observacoes                 text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 5 — PRODUÇÃO AGRÍCOLA (Crop Production)            ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS crop_productions (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                   uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,

  -- Activity identification
  municipio                   text,
  atividade                   text        NOT NULL,   -- SOJA, MILHO, CAFÉ ARÁBICA, etc.
  codigo_atividade            integer,                -- BB standard activity code
  sistema_producao            text,                   -- RTA system number/name
  tipo_cultivo                text        CHECK (tipo_cultivo IN (
                                            'Convencional','Orgânico',
                                            'Integração Lavoura-Pecuária','Irrigado','Outro')),
  irrigacao                   boolean     DEFAULT false,

  -- Timing
  safra                       text,                   -- e.g. '2024/2025'
  epoca_implantacao           text,                   -- planting epoch (for perennial crops)
  epoca_colheita              text,                   -- e.g. 'Mar/2025 a Mai/2025'
  epoca_comercializacao       text,
  periodo_producao            text,

  -- Participation & area
  participacao_pct            numeric(5,2) DEFAULT 100,
  area_ha                     numeric(12,4),
  unidade_produtividade       text        DEFAULT 'kg/ha',

  -- Yields
  produtividade_prevista      numeric(12,4),
  produtividade_obtida        numeric(12,4),
  frustracao_safra            boolean     DEFAULT false,

  -- Prices & revenue
  preco_unitario              numeric(14,4),          -- R$ per unit
  receita_bruta               numeric(14,2),
  receita_liquida             numeric(14,2),

  -- Costs
  custo_producao_por_ha       numeric(14,2),
  custo_producao_total        numeric(14,2),
  custo_arrendamento          numeric(14,2),          -- rental cost (R$/year)

  -- Equipment outsourcing
  pct_tratores_terceiros      numeric(5,2),
  pct_colheitadeiras_terceiros numeric(5,2),

  -- Property allocation (denormalized as JSON array for simplicity)
  -- [{descricao: "Fazenda X", area_ha: 500}, ...]
  imoveis_explorados          jsonb       DEFAULT '[]',

  -- Soil use breakdown for this activity (Anexo 05 fields, in ha)
  area_lavouras_periodicas    numeric(12,4),
  area_lavouras_permanentes   numeric(12,4),
  area_pastagens_formada      numeric(12,4),
  area_pastagens_nativa       numeric(12,4),
  area_capineiras             numeric(12,4),
  area_arrendadas_pasto_nativa    numeric(12,4),
  area_arrendadas_pasto_formada   numeric(12,4),
  area_arrendadas_lavoura_periodica  numeric(12,4),
  area_arrendadas_lavoura_permanente numeric(12,4),
  area_matas                  numeric(12,4),
  area_capoeiras              numeric(12,4),
  area_cerrado                numeric(12,4),
  area_instalacoes_estradas   numeric(12,4),

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 6 — PRODUÇÃO PECUÁRIA (Livestock Production)       ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS livestock_productions (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                   uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,

  -- Activity identification
  municipio                   text,
  atividade                   text        NOT NULL,   -- Bovinocultura-Corte, Suinocultura, etc.
  codigo_atividade            text,                   -- BB standard code (e.g. '825')
  sistema_producao            text,
  fase_exploracao             text        CHECK (fase_exploracao IN (
                                            'Cria','Recria','Engorda',
                                            'Cria/Recria','Recria/Engorda','Ciclo Completo')),

  -- Production parameters
  unidade_produtividade       text,                   -- bois gordo/matriz/ano, etc.
  produtividade               numeric(12,4),
  periodo_producao            text,                   -- e.g. 'Jan/2024 a Dez/2024'
  participacao_pct            numeric(5,2) DEFAULT 100,
  qtd_matriz_bovina           integer,
  ciclos_por_ano              numeric(5,2) DEFAULT 1,

  -- Output & prices
  preco_unitario              numeric(14,4),          -- R$/kg PV boi gordo
  producao_total_kg           numeric(14,2),
  producao_por_matriz         numeric(14,4),          -- kg/matriz/ciclo

  -- Revenue breakdown
  receita_venda_boi_gordo     numeric(14,2),
  receita_bezerra_zebuina     numeric(14,2),
  receita_novilha_zebuina     numeric(14,2),
  receita_vaca_descarte       numeric(14,2),
  receita_outros              numeric(14,2),
  receita_total               numeric(14,2),
  receita_por_matriz          numeric(14,4),          -- R$/matriz/ciclo

  -- Operating costs (Custeio — Anexo 10)
  custo_alimentacao           numeric(14,2),
  custo_assist_veterinaria    numeric(14,2),
  custo_vacinas               numeric(14,2),
  custo_medicamentos          numeric(14,2),
  custo_outros_sanidade       numeric(14,2),
  custo_mao_de_obra           numeric(14,2),
  custo_energia_eletrica      numeric(14,2),
  custo_combustivel           numeric(14,2),
  custo_transporte_interno    numeric(14,2),
  custo_assist_tecnica        numeric(14,2),
  custo_outros_operacional    numeric(14,2),
  total_custeio               numeric(14,2),

  -- Other disbursements
  desembolso_transporte_externo     numeric(14,2),
  desembolso_manutencao_instalacoes numeric(14,2),
  desembolso_seguro_producao        numeric(14,2),
  desembolso_seguridade_social      numeric(14,2),
  desembolso_arrendamentos          numeric(14,2),
  desembolso_outros                 numeric(14,2),
  total_outros_desembolsos          numeric(14,2),

  -- Totals
  custo_total_direto          numeric(14,2),
  custo_total_com_arrendamento numeric(14,2),
  custo_por_matriz            numeric(14,4),          -- R$/matriz/ciclo

  -- Efficiency indicators
  pct_tratores_terceiros      numeric(5,2),
  receita_liquida_anual       numeric(14,2),

  -- Property allocation (denormalized as JSON array for simplicity)
  -- [{descricao: "Fazenda X", area_ha: 200}, ...]
  imoveis_explorados          jsonb       DEFAULT '[]',

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  SECTION 7 — FINANCEIRO                                     ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 7a. Existing debts / obligations (Anexo 04)
CREATE TABLE IF NOT EXISTS client_debts (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                   uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,

  -- Debt identification
  especificacao               text        NOT NULL,   -- Bancos, Fornecedores, Tributos, Outros
  finalidade                  text,                   -- aquisição de terras, equipamentos, insumos, etc.
  banco_credor                text,
  numero_operacao             text,

  -- Terms
  data_contratacao            date,
  data_vencimento             date,
  prazo_meses                 integer     CHECK (prazo_meses >= 0),
  taxa_anual_pct              numeric(6,3),
  juros_atraso_pct            numeric(6,3),

  -- Balance & payments
  saldo_devedor               numeric(14,2),
  valor_parcela               numeric(14,2),
  status                      text        CHECK (status IN ('Em dia','Atrasada','Renegociada')),

  observacoes                 text,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- 7b. Financial capacity profile (one per client — Laudo Técnico)
CREATE TABLE IF NOT EXISTS client_financial_profiles (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                   uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,

  -- Harvest revenue (custeio assessment)
  produto_custeio             text,
  receita_prevista_custeio    numeric(14,2),
  receita_obtida_custeio      numeric(14,2),
  preco_previsto_unitario     numeric(14,4),
  preco_obtido_unitario       numeric(14,4),

  -- Deductible expenses
  despesas_pos_colheita       numeric(14,2),          -- transport, storage, etc.
  manutencao_familiar         numeric(14,2),          -- max 10% receita / max R$240k
  icms_inss                   numeric(14,2),
  amortizacao_operacoes_rurais numeric(14,2),
  total_despesas_dedutiveis   numeric(14,2),

  -- Capacity indicators
  saldo_recolher              numeric(14,2),          -- receita - despesas
  valor_prorrogar             numeric(14,2),

  -- Producer ratings (used in Laudo Técnico scoring)
  estrutura_fundiaria_rating  integer     CHECK (estrutura_fundiaria_rating BETWEEN 1 AND 5),
  opera_mercado_futuro        boolean,
  controle_financeiro         boolean,
  grupo_familiar              boolean,
  cooperado                   boolean,
  nivel_assistencia_tecnica   integer     CHECK (nivel_assistencia_tecnica BETWEEN 1 AND 5),
  anos_experiencia            integer     CHECK (anos_experiencia >= 0),
  experiencia_operacoes       integer     CHECK (experiencia_operacoes BETWEEN 1 AND 3),

  -- 5-year revenue forecast (stored as JSON array)
  -- [{ano: 1, produto: "Soja", receita: 1200000}, ...]
  previsao_receitas           jsonb       DEFAULT '[]',

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  UNIQUE (client_id)
);


-- ══════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS semoventes_client_idx           ON semoventes           (client_id);
CREATE INDEX IF NOT EXISTS semoventes_org_idx              ON semoventes           (organization_id);
CREATE INDEX IF NOT EXISTS herd_coefficients_client_idx    ON herd_coefficients    (client_id);
CREATE INDEX IF NOT EXISTS movable_assets_client_idx       ON movable_assets       (client_id);
CREATE INDEX IF NOT EXISTS movable_assets_org_idx          ON movable_assets       (organization_id);
CREATE INDEX IF NOT EXISTS crop_productions_client_idx     ON crop_productions     (client_id);
CREATE INDEX IF NOT EXISTS crop_productions_org_idx        ON crop_productions     (organization_id);
CREATE INDEX IF NOT EXISTS livestock_productions_client_idx ON livestock_productions (client_id);
CREATE INDEX IF NOT EXISTS livestock_productions_org_idx   ON livestock_productions (organization_id);
CREATE INDEX IF NOT EXISTS client_debts_client_idx         ON client_debts         (client_id);
CREATE INDEX IF NOT EXISTS client_debts_org_idx            ON client_debts         (organization_id);
CREATE INDEX IF NOT EXISTS client_financial_profiles_client_idx ON client_financial_profiles (client_id);


-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- (same org-scoped pattern as existing tables)
-- ══════════════════════════════════════════════════════════════

ALTER TABLE semoventes               ENABLE ROW LEVEL SECURITY;
ALTER TABLE herd_coefficients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE movable_assets           ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_productions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE livestock_productions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_debts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_financial_profiles ENABLE ROW LEVEL SECURITY;

-- ── semoventes ────────────────────────────────────────────────
DROP POLICY IF EXISTS "semoventes_select" ON semoventes;
DROP POLICY IF EXISTS "semoventes_insert" ON semoventes;
DROP POLICY IF EXISTS "semoventes_update" ON semoventes;
DROP POLICY IF EXISTS "semoventes_delete" ON semoventes;

CREATE POLICY "semoventes_select" ON semoventes FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "semoventes_insert" ON semoventes FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "semoventes_update" ON semoventes FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "semoventes_delete" ON semoventes FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ── herd_coefficients ─────────────────────────────────────────
DROP POLICY IF EXISTS "herd_coefficients_select" ON herd_coefficients;
DROP POLICY IF EXISTS "herd_coefficients_insert" ON herd_coefficients;
DROP POLICY IF EXISTS "herd_coefficients_update" ON herd_coefficients;
DROP POLICY IF EXISTS "herd_coefficients_delete" ON herd_coefficients;

CREATE POLICY "herd_coefficients_select" ON herd_coefficients FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "herd_coefficients_insert" ON herd_coefficients FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "herd_coefficients_update" ON herd_coefficients FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "herd_coefficients_delete" ON herd_coefficients FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ── movable_assets ────────────────────────────────────────────
DROP POLICY IF EXISTS "movable_assets_select" ON movable_assets;
DROP POLICY IF EXISTS "movable_assets_insert" ON movable_assets;
DROP POLICY IF EXISTS "movable_assets_update" ON movable_assets;
DROP POLICY IF EXISTS "movable_assets_delete" ON movable_assets;

CREATE POLICY "movable_assets_select" ON movable_assets FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "movable_assets_insert" ON movable_assets FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "movable_assets_update" ON movable_assets FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "movable_assets_delete" ON movable_assets FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ── crop_productions ──────────────────────────────────────────
DROP POLICY IF EXISTS "crop_productions_select" ON crop_productions;
DROP POLICY IF EXISTS "crop_productions_insert" ON crop_productions;
DROP POLICY IF EXISTS "crop_productions_update" ON crop_productions;
DROP POLICY IF EXISTS "crop_productions_delete" ON crop_productions;

CREATE POLICY "crop_productions_select" ON crop_productions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "crop_productions_insert" ON crop_productions FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "crop_productions_update" ON crop_productions FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "crop_productions_delete" ON crop_productions FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ── livestock_productions ─────────────────────────────────────
DROP POLICY IF EXISTS "livestock_productions_select" ON livestock_productions;
DROP POLICY IF EXISTS "livestock_productions_insert" ON livestock_productions;
DROP POLICY IF EXISTS "livestock_productions_update" ON livestock_productions;
DROP POLICY IF EXISTS "livestock_productions_delete" ON livestock_productions;

CREATE POLICY "livestock_productions_select" ON livestock_productions FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "livestock_productions_insert" ON livestock_productions FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "livestock_productions_update" ON livestock_productions FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "livestock_productions_delete" ON livestock_productions FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ── client_debts ──────────────────────────────────────────────
DROP POLICY IF EXISTS "client_debts_select" ON client_debts;
DROP POLICY IF EXISTS "client_debts_insert" ON client_debts;
DROP POLICY IF EXISTS "client_debts_update" ON client_debts;
DROP POLICY IF EXISTS "client_debts_delete" ON client_debts;

CREATE POLICY "client_debts_select" ON client_debts FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "client_debts_insert" ON client_debts FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "client_debts_update" ON client_debts FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "client_debts_delete" ON client_debts FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

-- ── client_financial_profiles ─────────────────────────────────
DROP POLICY IF EXISTS "client_financial_profiles_select" ON client_financial_profiles;
DROP POLICY IF EXISTS "client_financial_profiles_insert" ON client_financial_profiles;
DROP POLICY IF EXISTS "client_financial_profiles_update" ON client_financial_profiles;
DROP POLICY IF EXISTS "client_financial_profiles_delete" ON client_financial_profiles;

CREATE POLICY "client_financial_profiles_select" ON client_financial_profiles FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "client_financial_profiles_insert" ON client_financial_profiles FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "client_financial_profiles_update" ON client_financial_profiles FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "client_financial_profiles_delete" ON client_financial_profiles FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- ══════════════════════════════════════════════════════════════
-- AUTO-UPDATE updated_at TRIGGERS
-- (reuses the set_updated_at() function from 001_initial_schema)
-- ══════════════════════════════════════════════════════════════

DROP TRIGGER IF EXISTS trg_semoventes_updated_at              ON semoventes;
DROP TRIGGER IF EXISTS trg_herd_coefficients_updated_at       ON herd_coefficients;
DROP TRIGGER IF EXISTS trg_movable_assets_updated_at          ON movable_assets;
DROP TRIGGER IF EXISTS trg_crop_productions_updated_at        ON crop_productions;
DROP TRIGGER IF EXISTS trg_livestock_productions_updated_at   ON livestock_productions;
DROP TRIGGER IF EXISTS trg_client_debts_updated_at            ON client_debts;
DROP TRIGGER IF EXISTS trg_client_financial_profiles_updated_at ON client_financial_profiles;

CREATE TRIGGER trg_semoventes_updated_at
  BEFORE UPDATE ON semoventes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_herd_coefficients_updated_at
  BEFORE UPDATE ON herd_coefficients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_movable_assets_updated_at
  BEFORE UPDATE ON movable_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_crop_productions_updated_at
  BEFORE UPDATE ON crop_productions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_livestock_productions_updated_at
  BEFORE UPDATE ON livestock_productions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_client_debts_updated_at
  BEFORE UPDATE ON client_debts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_client_financial_profiles_updated_at
  BEFORE UPDATE ON client_financial_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
