-- ════════════════════════════════════════════════════════════════
-- Migration 008 — Domain Model Final
-- ════════════════════════════════════════════════════════════════
-- Corrects 007 and completes the full Cadastro domain model.
-- Run order: 007 first, then 008.
-- All statements are idempotent (IF EXISTS / IF NOT EXISTS guards).
-- ════════════════════════════════════════════════════════════════


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 1 — Enable PostGIS                                    ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS postgis;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 2 — Drop obsolete table                               ║
-- ╚══════════════════════════════════════════════════════════════╝
-- herd_coefficients replaced by bovino_indices / suino_indices / aves_indices

DROP TABLE IF EXISTS herd_coefficients;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 3 — Fix clients + new table: client_bank_accounts     ║
-- ╚══════════════════════════════════════════════════════════════╝
-- agencia / prefixo were BB-specific columns added in 007.
-- Bank relationships move to client_bank_accounts (supports multiple banks).
-- dap_caf_numero is a producer credential — belongs on the client, not the property.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS dap_caf_numero text,
  DROP COLUMN IF EXISTS agencia,
  DROP COLUMN IF EXISTS prefixo;

CREATE TABLE IF NOT EXISTS client_bank_accounts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id             uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  banco                 text        NOT NULL,   -- 'BB', 'Sicredi', 'BNB', 'Bradesco', etc.
  codigo_banco          text,                   -- FEBRABAN code ('001' for BB)
  agencia               text,
  prefixo               text,                   -- BB-specific, NULL for other banks
  conta_corrente        text,
  tipo_conta            text        CHECK (tipo_conta IN ('corrente','poupanca','investimento')),
  principal             boolean     NOT NULL DEFAULT false,
  relacionamento_desde  date,                   -- credit signal: how long client has been with this bank
  ativo                 boolean     NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client_bank_accounts_select" ON client_bank_accounts;
DROP POLICY IF EXISTS "client_bank_accounts_insert" ON client_bank_accounts;
DROP POLICY IF EXISTS "client_bank_accounts_update" ON client_bank_accounts;
DROP POLICY IF EXISTS "client_bank_accounts_delete" ON client_bank_accounts;

CREATE POLICY "client_bank_accounts_select" ON client_bank_accounts FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "client_bank_accounts_insert" ON client_bank_accounts FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "client_bank_accounts_update" ON client_bank_accounts FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "client_bank_accounts_delete" ON client_bank_accounts FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS trg_client_bank_accounts_updated_at ON client_bank_accounts;
CREATE TRIGGER trg_client_bank_accounts_updated_at
  BEFORE UPDATE ON client_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 4 — Fix rural_properties                              ║
-- ╚══════════════════════════════════════════════════════════════╝
-- 007 added lat/lon as text DMS strings — unusable for spatial queries.
-- Replace with decimal degrees + PostGIS geometry.
-- Add CAR fields, IBGE municipality code, climate zone.

ALTER TABLE rural_properties
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude,
  ADD COLUMN IF NOT EXISTS latitude            numeric(10,7),        -- decimal degrees, negative = South
  ADD COLUMN IF NOT EXISTS longitude           numeric(10,7),        -- decimal degrees, negative = West
  ADD COLUMN IF NOT EXISTS geometria           geometry(MultiPolygon, 4326),  -- from shapefile upload
  ADD COLUMN IF NOT EXISTS municipio_ibge_code text,                 -- 7-digit IBGE code
  ADD COLUMN IF NOT EXISTS clima_zona          text,                 -- Köppen or EMBRAPA zone
  ADD COLUMN IF NOT EXISTS car_numero          text,
  ADD COLUMN IF NOT EXISTS car_status          text CHECK (car_status IN (
    'Ativo','Pendente','Cancelado','Suspenso')),
  ADD COLUMN IF NOT EXISTS car_data_inscricao  date,
  ADD COLUMN IF NOT EXISTS car_area_ha         numeric(12,4);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 5 — New table: talhoes + talhao_field_history         ║
-- ╚══════════════════════════════════════════════════════════════╝
-- talhoes covers agricultural fields AND livestock paddocks via tipo column.
-- PostGIS geometry for shapefile-sourced boundaries.
-- Created before steps 6/7 which add FK references to it.

CREATE TABLE IF NOT EXISTS talhoes (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  property_id              uuid        NOT NULL REFERENCES rural_properties(id) ON DELETE CASCADE,
  nome                     text        NOT NULL,
  tipo                     text        NOT NULL CHECK (tipo IN ('agricola','pastagem','misto','instalacao')),
  area_ha                  numeric(12,4),   -- manual; auto-calculated from geometry when available
  geometria                geometry(MultiPolygon, 4326),  -- area derived via ST_Area(geometria::geography)
  -- Crop-specific (NULL for livestock areas)
  solo_classe              text,
  -- Livestock-specific (NULL for crop areas)
  tipo_pastagem            text,
  capacidade_suporte_ua_ha numeric(6,2),
  irrigado                 boolean     DEFAULT false,
  tipo_irrigacao           text,
  observacoes              text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE talhoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "talhoes_select" ON talhoes;
DROP POLICY IF EXISTS "talhoes_insert" ON talhoes;
DROP POLICY IF EXISTS "talhoes_update" ON talhoes;
DROP POLICY IF EXISTS "talhoes_delete" ON talhoes;

CREATE POLICY "talhoes_select" ON talhoes FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "talhoes_insert" ON talhoes FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "talhoes_update" ON talhoes FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "talhoes_delete" ON talhoes FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS trg_talhoes_updated_at ON talhoes;
CREATE TRIGGER trg_talhoes_updated_at
  BEFORE UPDATE ON talhoes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Audit history for talhões
CREATE TABLE IF NOT EXISTS talhao_field_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  talhao_id   uuid        NOT NULL REFERENCES talhoes(id)          ON DELETE CASCADE,
  client_id   uuid        NOT NULL REFERENCES clients(id)          ON DELETE CASCADE,
  property_id uuid        NOT NULL REFERENCES rural_properties(id) ON DELETE CASCADE,
  field_name  text        NOT NULL,
  old_value   text,
  new_value   text,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid        REFERENCES profiles(id),
  reason      text
);

ALTER TABLE talhao_field_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "talhao_field_history_select" ON talhao_field_history;
CREATE POLICY "talhao_field_history_select" ON talhao_field_history FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE OR REPLACE FUNCTION log_talhao_field_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  k        text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(new_json) LOOP
    CONTINUE WHEN k IN ('updated_at','created_at');
    CONTINUE WHEN old_json->>k IS NOT DISTINCT FROM new_json->>k;
    INSERT INTO talhao_field_history
      (talhao_id, client_id, property_id, field_name, old_value, new_value, changed_by)
    VALUES
      (NEW.id, NEW.client_id, NEW.property_id, k, old_json->>k, new_json->>k, auth.uid());
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_talhoes_field_history ON talhoes;
CREATE TRIGGER trg_talhoes_field_history
  AFTER UPDATE ON talhoes
  FOR EACH ROW EXECUTE FUNCTION log_talhao_field_changes();


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 6 — Extend crop_productions (reconciled with 007)     ║
-- ╚══════════════════════════════════════════════════════════════╝
-- 007 already has: receita_bruta, receita_liquida, preco_unitario,
-- custo_producao_total, custo_arrendamento, area_ha, atividade.
-- Drop superseded columns; add genuinely new ones only.

ALTER TABLE crop_productions
  DROP COLUMN IF EXISTS imoveis_explorados,
  DROP COLUMN IF EXISTS area_lavouras_periodicas,
  DROP COLUMN IF EXISTS area_lavouras_permanentes,
  DROP COLUMN IF EXISTS area_pastagens_formada,
  DROP COLUMN IF EXISTS area_pastagens_nativa,
  DROP COLUMN IF EXISTS area_capineiras,
  DROP COLUMN IF EXISTS area_arrendadas_pasto_nativa,
  DROP COLUMN IF EXISTS area_arrendadas_pasto_formada,
  DROP COLUMN IF EXISTS area_arrendadas_lavoura_periodica,
  DROP COLUMN IF EXISTS area_arrendadas_lavoura_permanente,
  DROP COLUMN IF EXISTS area_matas,
  DROP COLUMN IF EXISTS area_capoeiras,
  DROP COLUMN IF EXISTS area_cerrado,
  DROP COLUMN IF EXISTS area_instalacoes_estradas;

ALTER TABLE crop_productions
  -- Area attribution
  ADD COLUMN IF NOT EXISTS property_id             uuid        NOT NULL REFERENCES rural_properties(id),
  ADD COLUMN IF NOT EXISTS talhao_id               uuid        REFERENCES talhoes(id),
  -- Classification
  ADD COLUMN IF NOT EXISTS production_type         text        CHECK (production_type IN (
    'temporaria','permanente','horticultura','fruticultura')),
  ADD COLUMN IF NOT EXISTS production_system_id    uuid,       -- FK added after production_systems (step 14)
  ADD COLUMN IF NOT EXISTS municipio_ibge_code     text,
  -- Named cost breakdown (supplements 007's custo_producao_total catch-all)
  ADD COLUMN IF NOT EXISTS custo_sementes          numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_fertilizantes     numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_defensivos        numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_mao_de_obra       numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_energia           numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_combustivel       numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_transporte        numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_assist_tecnica    numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_outros            numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_total             numeric(14,2),
  -- Revenue (despesas_comercializacao is new; receita_bruta/liquida already in 007)
  ADD COLUMN IF NOT EXISTS despesas_comercializacao numeric(14,2),
  -- Management practices
  ADD COLUMN IF NOT EXISTS plantio_direto          boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS subsolagem              boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS calagem                 boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS planta_cobertura        text,
  ADD COLUMN IF NOT EXISTS sistema_integracao      text        CHECK (sistema_integracao IN (
    'ILP','ILPF','iLPF','agrofloresta','SAF')),
  -- Perennial-specific (NULL for annual)
  ADD COLUMN IF NOT EXISTS ciclo_produtivo_anos    integer,
  ADD COLUMN IF NOT EXISTS custo_implantacao_ha    numeric(14,2),
  -- Horticultura-specific (NULL for others)
  ADD COLUMN IF NOT EXISTS ciclos_por_ano          numeric(4,1),
  ADD COLUMN IF NOT EXISTS cultivo_protegido       boolean     DEFAULT false;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 7 — Extend livestock_productions (reconciled with 007)║
-- ╚══════════════════════════════════════════════════════════════╝
-- 007 already has extensive named cost and revenue columns for cattle.
-- Only add what is genuinely missing.

ALTER TABLE livestock_productions
  DROP COLUMN IF EXISTS imoveis_explorados;

ALTER TABLE livestock_productions
  -- Area attribution
  ADD COLUMN IF NOT EXISTS property_id          uuid        NOT NULL REFERENCES rural_properties(id),
  ADD COLUMN IF NOT EXISTS talhao_id            uuid        REFERENCES talhoes(id),
  -- Classification
  ADD COLUMN IF NOT EXISTS species_type         text        CHECK (species_type IN (
    'bovino_corte','bovino_leite','suino','aves','ovino','caprino')),
  ADD COLUMN IF NOT EXISTS production_system_id uuid,       -- FK added in step 14
  ADD COLUMN IF NOT EXISTS municipio_ibge_code  text,
  -- Revenue missing from 007's cattle-centric columns (needed for dairy, pigs, poultry)
  ADD COLUMN IF NOT EXISTS receita_animais      numeric(14,2),   -- generic animal sales
  ADD COLUMN IF NOT EXISTS receita_produtos     numeric(14,2),   -- milk, eggs, wool, honey
  ADD COLUMN IF NOT EXISTS preco_medio_venda    numeric(14,2),   -- R$/arroba | R$/litro | R$/dz
  ADD COLUMN IF NOT EXISTS qtd_animais_vendidos integer,
  -- Cost missing from 007
  ADD COLUMN IF NOT EXISTS custo_reproducao     numeric(14,2);   -- AI, bulls, semen


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 8 — Fix documents architecture                        ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Documents belong to the master client record, not to a specific application.
-- application_id becomes nullable; client_id and property_id added.

ALTER TABLE documents
  ALTER COLUMN application_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS client_id    uuid REFERENCES clients(id)          ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS property_id  uuid REFERENCES rural_properties(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS doc_category text CHECK (doc_category IN (
    'pessoal','imovel','producao','financeiro','ambiental','application'));

ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_must_have_owner;
ALTER TABLE documents
  ADD CONSTRAINT documents_must_have_owner
    CHECK (application_id IS NOT NULL OR client_id IS NOT NULL);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 9 — Extend semoventes                                 ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Add property FK (replaces free-text matricula_imovel_localizacao).
-- Add ano_referencia for history versioning.

ALTER TABLE semoventes
  ADD COLUMN IF NOT EXISTS property_id    uuid    REFERENCES rural_properties(id),
  ADD COLUMN IF NOT EXISTS ano_referencia integer NOT NULL
    DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer;

CREATE UNIQUE INDEX IF NOT EXISTS semoventes_category_year_idx
  ON semoventes (
    client_id, especie_tipo,
    COALESCE(sexo,''), COALESCE(finalidade,''), COALESCE(raca,''),
    ano_referencia
  );


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 10 — Extend movable_assets                            ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Add property FK (replaces free-text localizacao).
-- Add ano_referencia for history versioning + alienado_em for soft-dispose.

ALTER TABLE movable_assets
  ADD COLUMN IF NOT EXISTS property_id    uuid    REFERENCES rural_properties(id),
  ADD COLUMN IF NOT EXISTS ano_referencia integer NOT NULL
    DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer,
  ADD COLUMN IF NOT EXISTS alienado_em    date;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 11 — New table: farm_overhead_costs                   ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Annual operating costs not attributable to a specific crop or livestock activity.
-- property_id nullable: some overhead spans all properties (admin, insurance).

CREATE TABLE IF NOT EXISTS farm_overhead_costs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id        uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  property_id      uuid        REFERENCES rural_properties(id),
  ano_referencia   integer     NOT NULL,
  categoria        text        NOT NULL CHECK (categoria IN (
    'arrendamento','seguros','administracao','energia_geral','manutencao','outros')),
  descricao        text,
  valor            numeric(14,2) NOT NULL CHECK (valor >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE farm_overhead_costs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "farm_overhead_costs_select" ON farm_overhead_costs;
DROP POLICY IF EXISTS "farm_overhead_costs_insert" ON farm_overhead_costs;
DROP POLICY IF EXISTS "farm_overhead_costs_update" ON farm_overhead_costs;
DROP POLICY IF EXISTS "farm_overhead_costs_delete" ON farm_overhead_costs;

CREATE POLICY "farm_overhead_costs_select" ON farm_overhead_costs FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "farm_overhead_costs_insert" ON farm_overhead_costs FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "farm_overhead_costs_update" ON farm_overhead_costs FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "farm_overhead_costs_delete" ON farm_overhead_costs FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS trg_farm_overhead_costs_updated_at ON farm_overhead_costs;
CREATE TRIGGER trg_farm_overhead_costs_updated_at
  BEFORE UPDATE ON farm_overhead_costs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 12 — Extend client_debts (soft-delete)                ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE client_debts
  ADD COLUMN IF NOT EXISTS liquidada_em date;

ALTER TABLE client_debts
  DROP CONSTRAINT IF EXISTS client_debts_status_check;
ALTER TABLE client_debts
  ADD CONSTRAINT client_debts_status_check
    CHECK (status IN ('Em dia','Atrasada','Renegociada','Liquidada'));


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 13 — Extend client_financial_profiles (annual version)║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE client_financial_profiles
  ADD COLUMN IF NOT EXISTS ano_referencia integer NOT NULL
    DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer;

ALTER TABLE client_financial_profiles
  DROP CONSTRAINT IF EXISTS client_financial_profiles_client_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS cfp_client_ano_idx
  ON client_financial_profiles (client_id, ano_referencia);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 14 — New table: production_systems                    ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Links crop and livestock rows sharing physical area (ILP/ILPF/SAF).
-- Created before adding FK constraints from production tables.

CREATE TABLE IF NOT EXISTS production_systems (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id        uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  property_id      uuid        REFERENCES rural_properties(id),
  talhao_id        uuid        REFERENCES talhoes(id),
  tipo             text        NOT NULL CHECK (tipo IN (
    'consorciacao','ILP','ILPF','silvipastoril','SAF','agrofloresta')),
  nome             text,
  descricao        text,
  area_ha          numeric(12,4),
  ano_implantacao  integer,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE production_systems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "production_systems_select" ON production_systems;
DROP POLICY IF EXISTS "production_systems_insert" ON production_systems;
DROP POLICY IF EXISTS "production_systems_update" ON production_systems;
DROP POLICY IF EXISTS "production_systems_delete" ON production_systems;

CREATE POLICY "production_systems_select" ON production_systems FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "production_systems_insert" ON production_systems FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "production_systems_update" ON production_systems FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "production_systems_delete" ON production_systems FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS trg_production_systems_updated_at ON production_systems;
CREATE TRIGGER trg_production_systems_updated_at
  BEFORE UPDATE ON production_systems
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- FK constraints from production tables (production_system_id was added without FK earlier)
ALTER TABLE crop_productions
  DROP CONSTRAINT IF EXISTS crop_productions_system_fk;
ALTER TABLE crop_productions
  ADD CONSTRAINT crop_productions_system_fk
    FOREIGN KEY (production_system_id) REFERENCES production_systems(id);

ALTER TABLE livestock_productions
  DROP CONSTRAINT IF EXISTS livestock_productions_system_fk;
ALTER TABLE livestock_productions
  ADD CONSTRAINT livestock_productions_system_fk
    FOREIGN KEY (production_system_id) REFERENCES production_systems(id);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 15 — Field history tables (5 tables + triggers)       ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Same trigger pattern across all major tables.
-- Captures expected→actual transitions on production tables.
-- All triggers: loop jsonb_object_keys(NEW), skip updated_at/created_at,
--   insert one row per changed field with old→new values.

-- ── clients ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS client_field_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  field_name  text        NOT NULL,
  old_value   text,
  new_value   text,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid        REFERENCES profiles(id),
  reason      text
);

ALTER TABLE client_field_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_field_history_select" ON client_field_history;
CREATE POLICY "client_field_history_select" ON client_field_history FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE OR REPLACE FUNCTION log_client_field_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  k        text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(new_json) LOOP
    CONTINUE WHEN k IN ('updated_at','created_at');
    CONTINUE WHEN old_json->>k IS NOT DISTINCT FROM new_json->>k;
    INSERT INTO client_field_history (client_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, k, old_json->>k, new_json->>k, auth.uid());
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_field_history ON clients;
CREATE TRIGGER trg_clients_field_history
  AFTER UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION log_client_field_changes();

-- ── rural_properties ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS property_field_history (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid        NOT NULL REFERENCES rural_properties(id) ON DELETE CASCADE,
  client_id   uuid        NOT NULL REFERENCES clients(id)          ON DELETE CASCADE,
  field_name  text        NOT NULL,
  old_value   text,
  new_value   text,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  changed_by  uuid        REFERENCES profiles(id),
  reason      text
);

ALTER TABLE property_field_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "property_field_history_select" ON property_field_history;
CREATE POLICY "property_field_history_select" ON property_field_history FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE OR REPLACE FUNCTION log_property_field_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  k        text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(new_json) LOOP
    CONTINUE WHEN k IN ('updated_at','created_at');
    CONTINUE WHEN old_json->>k IS NOT DISTINCT FROM new_json->>k;
    INSERT INTO property_field_history (property_id, client_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.client_id, k, old_json->>k, new_json->>k, auth.uid());
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rural_properties_field_history ON rural_properties;
CREATE TRIGGER trg_rural_properties_field_history
  AFTER UPDATE ON rural_properties
  FOR EACH ROW EXECUTE FUNCTION log_property_field_changes();

-- ── crop_productions ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crop_production_field_history (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_production_id uuid        NOT NULL REFERENCES crop_productions(id) ON DELETE CASCADE,
  client_id          uuid        NOT NULL REFERENCES clients(id)          ON DELETE CASCADE,
  field_name         text        NOT NULL,
  old_value          text,
  new_value          text,
  changed_at         timestamptz NOT NULL DEFAULT now(),
  changed_by         uuid        REFERENCES profiles(id),
  reason             text
);

ALTER TABLE crop_production_field_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crop_production_field_history_select" ON crop_production_field_history;
CREATE POLICY "crop_production_field_history_select" ON crop_production_field_history FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE OR REPLACE FUNCTION log_crop_production_field_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  k        text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(new_json) LOOP
    CONTINUE WHEN k IN ('updated_at','created_at');
    CONTINUE WHEN old_json->>k IS NOT DISTINCT FROM new_json->>k;
    INSERT INTO crop_production_field_history (crop_production_id, client_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.client_id, k, old_json->>k, new_json->>k, auth.uid());
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crop_productions_field_history ON crop_productions;
CREATE TRIGGER trg_crop_productions_field_history
  AFTER UPDATE ON crop_productions
  FOR EACH ROW EXECUTE FUNCTION log_crop_production_field_changes();

-- ── livestock_productions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS livestock_production_field_history (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  livestock_production_id uuid        NOT NULL REFERENCES livestock_productions(id) ON DELETE CASCADE,
  client_id               uuid        NOT NULL REFERENCES clients(id)               ON DELETE CASCADE,
  field_name              text        NOT NULL,
  old_value               text,
  new_value               text,
  changed_at              timestamptz NOT NULL DEFAULT now(),
  changed_by              uuid        REFERENCES profiles(id),
  reason                  text
);

ALTER TABLE livestock_production_field_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "livestock_production_field_history_select" ON livestock_production_field_history;
CREATE POLICY "livestock_production_field_history_select" ON livestock_production_field_history FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  ));

CREATE OR REPLACE FUNCTION log_livestock_production_field_changes()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  k        text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(new_json) LOOP
    CONTINUE WHEN k IN ('updated_at','created_at');
    CONTINUE WHEN old_json->>k IS NOT DISTINCT FROM new_json->>k;
    INSERT INTO livestock_production_field_history (livestock_production_id, client_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.client_id, k, old_json->>k, new_json->>k, auth.uid());
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_livestock_productions_field_history ON livestock_productions;
CREATE TRIGGER trg_livestock_productions_field_history
  AFTER UPDATE ON livestock_productions
  FOR EACH ROW EXECUTE FUNCTION log_livestock_production_field_changes();


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 16 — New table: property_improvements (benfeitorias)  ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Soft-delete: rows deactivated only, never physically deleted.

CREATE TABLE IF NOT EXISTS property_improvements (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id          uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  property_id        uuid        NOT NULL REFERENCES rural_properties(id),
  tipo               text        NOT NULL,   -- casa sede | galpão | silo | curral | açude | cerca
  area_m2            numeric(10,2),
  valor_estimado     numeric(14,2),
  estado_conservacao text        CHECK (estado_conservacao IN ('Bom','Regular','Ruim')),
  ano_construcao     integer,
  gravame            boolean     DEFAULT false,
  ativo              boolean     NOT NULL DEFAULT true,
  inativado_em       date,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE property_improvements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_improvements_select" ON property_improvements;
DROP POLICY IF EXISTS "property_improvements_insert" ON property_improvements;
DROP POLICY IF EXISTS "property_improvements_update" ON property_improvements;

CREATE POLICY "property_improvements_select" ON property_improvements FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "property_improvements_insert" ON property_improvements FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "property_improvements_update" ON property_improvements FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
-- No DELETE policy — rows deactivated only

DROP TRIGGER IF EXISTS trg_property_improvements_updated_at ON property_improvements;
CREATE TRIGGER trg_property_improvements_updated_at
  BEFORE UPDATE ON property_improvements
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 17 — New table: property_land_use (uso do solo)       ║
-- ╚══════════════════════════════════════════════════════════════╝
-- One set of rows per property per year.
-- UNIQUE(property_id, categoria, ano) prevents duplicate entries.

CREATE TABLE IF NOT EXISTS property_land_use (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id       uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  property_id     uuid        NOT NULL REFERENCES rural_properties(id),
  ano             integer     NOT NULL,
  categoria       text        NOT NULL CHECK (categoria IN (
    'lavoura_periodica','lavoura_permanente',
    'pastagem_formada','pastagem_nativa','capineira',
    'arrendada_pasto_nativa','arrendada_pasto_formada',
    'arrendada_lavoura_periodica','arrendada_lavoura_permanente',
    'mata','capoeira','cerrado','APP','reserva_legal',
    'instalacoes_estradas','outros')),
  area_ha         numeric(12,4) NOT NULL CHECK (area_ha >= 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, categoria, ano)
);

ALTER TABLE property_land_use ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_land_use_select" ON property_land_use;
DROP POLICY IF EXISTS "property_land_use_insert" ON property_land_use;
DROP POLICY IF EXISTS "property_land_use_update" ON property_land_use;
DROP POLICY IF EXISTS "property_land_use_delete" ON property_land_use;

CREATE POLICY "property_land_use_select" ON property_land_use FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "property_land_use_insert" ON property_land_use FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "property_land_use_update" ON property_land_use FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "property_land_use_delete" ON property_land_use FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 18 — New table: soil_analyses                         ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Each analysis is its own row — natural versioning via data_coleta.
-- Latest: ORDER BY data_coleta DESC LIMIT 1.

CREATE TABLE IF NOT EXISTS soil_analyses (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id        uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  property_id      uuid        NOT NULL REFERENCES rural_properties(id),
  talhao_id        uuid        REFERENCES talhoes(id),   -- nullable: per-field or property-level
  data_coleta      date        NOT NULL,
  laboratorio      text,
  numero_amostra   text,
  profundidade_cm  text,                -- e.g. '0-20', '20-40'
  -- Physical
  textura          text        CHECK (textura IN ('muito argilosa','argilosa','média','arenosa')),
  argila_pct       numeric(5,2),
  areia_pct        numeric(5,2),
  silte_pct        numeric(5,2),
  -- pH
  ph_agua          numeric(4,2),
  ph_cacl2         numeric(4,2),
  -- Macronutrients
  calcio           numeric(8,3),        -- cmolc/dm³
  magnesio         numeric(8,3),
  potassio         numeric(8,3),
  fosforo          numeric(8,3),        -- mg/dm³
  enxofre          numeric(8,3),
  -- Acidity
  aluminio         numeric(8,3),
  acidez_potencial numeric(8,3),        -- H+Al
  ctc_efetiva      numeric(8,3),
  ctc_total        numeric(8,3),
  saturacao_bases_pct    numeric(5,2),
  saturacao_aluminio_pct numeric(5,2),
  -- Organic matter
  materia_organica numeric(6,2),        -- g/dm³
  -- Micronutrients (mg/dm³)
  boro             numeric(8,3),
  cobre            numeric(8,3),
  ferro            numeric(8,3),
  manganes         numeric(8,3),
  zinco            numeric(8,3),
  -- Lime/gypsum recommendations
  necessidade_calcario_ton_ha numeric(8,3),
  necessidade_gesso_ton_ha    numeric(8,3),
  prnt_calcario_pct           numeric(5,2),
  observacoes      text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE soil_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "soil_analyses_select" ON soil_analyses;
DROP POLICY IF EXISTS "soil_analyses_insert" ON soil_analyses;
DROP POLICY IF EXISTS "soil_analyses_update" ON soil_analyses;
DROP POLICY IF EXISTS "soil_analyses_delete" ON soil_analyses;

CREATE POLICY "soil_analyses_select" ON soil_analyses FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "soil_analyses_insert" ON soil_analyses FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "soil_analyses_update" ON soil_analyses FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "soil_analyses_delete" ON soil_analyses FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS trg_soil_analyses_updated_at ON soil_analyses;
CREATE TRIGGER trg_soil_analyses_updated_at
  BEFORE UPDATE ON soil_analyses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 19 — New table: property_imagery                      ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Metadata for drone and satellite imagery stored in Supabase Storage.
-- Geometry extracted from shapefiles is stored in talhoes.geometria, not here.

CREATE TABLE IF NOT EXISTS property_imagery (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id        uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  property_id      uuid        NOT NULL REFERENCES rural_properties(id),
  talhao_id        uuid        REFERENCES talhoes(id),
  tipo             text        NOT NULL CHECK (tipo IN (
    'drone_rgb','drone_ndvi','drone_termal','drone_ortomosaico',
    'satelite','shapefile','outro')),
  data_captura     date,
  resolucao_cm     numeric(8,2),   -- GSD in cm/pixel (drone imagery)
  area_ha          numeric(12,4),  -- coverage area
  file_path        text        NOT NULL,   -- Supabase Storage path
  file_size_kb     integer,
  processado       boolean     DEFAULT false,
  fonte            text,           -- 'DroneDeploy', 'Sentinel-2', 'Planet', etc.
  observacoes      text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE property_imagery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "property_imagery_select" ON property_imagery;
DROP POLICY IF EXISTS "property_imagery_insert" ON property_imagery;
DROP POLICY IF EXISTS "property_imagery_update" ON property_imagery;
DROP POLICY IF EXISTS "property_imagery_delete" ON property_imagery;

CREATE POLICY "property_imagery_select" ON property_imagery FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "property_imagery_insert" ON property_imagery FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "property_imagery_update" ON property_imagery FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "property_imagery_delete" ON property_imagery FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 20 — New tables: bovino_indices, suino_indices,       ║
-- ║            aves_indices                                      ║
-- ╚══════════════════════════════════════════════════════════════╝
-- One record per livestock_production record.
-- Separate tables per species — all columns meaningful, no sparse NULLs.

CREATE TABLE IF NOT EXISTS bovino_indices (
  id                         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id            uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                  uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  livestock_production_id    uuid        NOT NULL REFERENCES livestock_productions(id) ON DELETE CASCADE,
  natalidade_pct             numeric(5,2),
  mortalidade_bezerros_pct   numeric(5,2),
  mortalidade_adultos_pct    numeric(5,2),
  mortalidade_1_2_anos_pct   numeric(5,2),
  descarte_matrizes_pct      numeric(5,2),
  descarte_touros_pct        numeric(5,2),
  relacao_touro_vaca         integer,
  idade_desmame_meses        integer,
  peso_desmame_kg            numeric(8,2),
  peso_venda_kg              numeric(8,2),
  idade_venda_meses          integer,
  ganho_peso_diario_kg       numeric(6,3),
  lotacao_ua_ha              numeric(6,2),
  desfrute_pct               numeric(5,2),
  -- Dairy only (NULL for beef)
  producao_leite_litros_dia  numeric(8,2),
  dias_lactacao              integer,
  intervalo_partos_dias      integer,
  idade_primeiro_parto_meses integer,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (livestock_production_id)
);

CREATE TABLE IF NOT EXISTS suino_indices (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id             uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id                   uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  livestock_production_id     uuid        NOT NULL REFERENCES livestock_productions(id) ON DELETE CASCADE,
  leitoes_nascidos_vivos      numeric(5,2),
  mortalidade_maternidade_pct numeric(5,2),
  mortalidade_creche_pct      numeric(5,2),
  mortalidade_crescimento_pct numeric(5,2),
  partos_por_porca_ano        numeric(4,2),
  peso_abate_kg               numeric(8,2),
  conversao_alimentar         numeric(5,3),
  dias_para_abate             integer,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (livestock_production_id)
);

CREATE TABLE IF NOT EXISTS aves_indices (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id               uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  livestock_production_id uuid        NOT NULL REFERENCES livestock_productions(id) ON DELETE CASCADE,
  mortalidade_pct         numeric(5,2),
  conversao_alimentar     numeric(5,3),
  peso_abate_kg           numeric(6,3),
  dias_para_abate         integer,
  viabilidade_pct         numeric(5,2),
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (livestock_production_id)
);

ALTER TABLE bovino_indices ENABLE ROW LEVEL SECURITY;
ALTER TABLE suino_indices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aves_indices   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bovino_indices_select" ON bovino_indices;
DROP POLICY IF EXISTS "bovino_indices_insert" ON bovino_indices;
DROP POLICY IF EXISTS "bovino_indices_update" ON bovino_indices;
DROP POLICY IF EXISTS "bovino_indices_delete" ON bovino_indices;

CREATE POLICY "bovino_indices_select" ON bovino_indices FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "bovino_indices_insert" ON bovino_indices FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "bovino_indices_update" ON bovino_indices FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "bovino_indices_delete" ON bovino_indices FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "suino_indices_select" ON suino_indices;
DROP POLICY IF EXISTS "suino_indices_insert" ON suino_indices;
DROP POLICY IF EXISTS "suino_indices_update" ON suino_indices;
DROP POLICY IF EXISTS "suino_indices_delete" ON suino_indices;

CREATE POLICY "suino_indices_select" ON suino_indices FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "suino_indices_insert" ON suino_indices FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "suino_indices_update" ON suino_indices FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "suino_indices_delete" ON suino_indices FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "aves_indices_select" ON aves_indices;
DROP POLICY IF EXISTS "aves_indices_insert" ON aves_indices;
DROP POLICY IF EXISTS "aves_indices_update" ON aves_indices;
DROP POLICY IF EXISTS "aves_indices_delete" ON aves_indices;

CREATE POLICY "aves_indices_select" ON aves_indices FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "aves_indices_insert" ON aves_indices FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "aves_indices_update" ON aves_indices FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "aves_indices_delete" ON aves_indices FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 21 — New table: crop_inputs                           ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS crop_inputs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id            uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  crop_production_id   uuid        NOT NULL REFERENCES crop_productions(id) ON DELETE CASCADE,
  categoria            text        NOT NULL CHECK (categoria IN (
    'fertilizante','defensivo','semente','corretivo','outros')),
  subcategoria         text,   -- pré-emergente | pós-emergente | herbicida | NPK | etc.
  produto              text,   -- brand/product name
  momento              text,   -- pré-plantio | plantio | cobertura | pós-emergente
  dose_ha              numeric(12,4),
  unidade_dose         text,
  area_aplicada_ha     numeric(12,4),
  custo_unitario       numeric(14,4),
  custo_total          numeric(14,2),
  data_aplicacao       date,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE crop_inputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crop_inputs_select" ON crop_inputs;
DROP POLICY IF EXISTS "crop_inputs_insert" ON crop_inputs;
DROP POLICY IF EXISTS "crop_inputs_update" ON crop_inputs;
DROP POLICY IF EXISTS "crop_inputs_delete" ON crop_inputs;

CREATE POLICY "crop_inputs_select" ON crop_inputs FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "crop_inputs_insert" ON crop_inputs FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "crop_inputs_update" ON crop_inputs FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "crop_inputs_delete" ON crop_inputs FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS trg_crop_inputs_updated_at ON crop_inputs;
CREATE TRIGGER trg_crop_inputs_updated_at
  BEFORE UPDATE ON crop_inputs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 22 — New table: livestock_inputs                      ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS livestock_inputs (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id               uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  livestock_production_id uuid        NOT NULL REFERENCES livestock_productions(id) ON DELETE CASCADE,
  categoria               text        NOT NULL CHECK (categoria IN (
    'alimentacao','vacina','medicamento','suplemento','outros')),
  produto                 text,
  quantidade              numeric(12,4),
  unidade                 text,
  custo_unitario          numeric(14,4),
  custo_total             numeric(14,2),
  data_aplicacao          date,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE livestock_inputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "livestock_inputs_select" ON livestock_inputs;
DROP POLICY IF EXISTS "livestock_inputs_insert" ON livestock_inputs;
DROP POLICY IF EXISTS "livestock_inputs_update" ON livestock_inputs;
DROP POLICY IF EXISTS "livestock_inputs_delete" ON livestock_inputs;

CREATE POLICY "livestock_inputs_select" ON livestock_inputs FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "livestock_inputs_insert" ON livestock_inputs FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "livestock_inputs_update" ON livestock_inputs FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "livestock_inputs_delete" ON livestock_inputs FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS trg_livestock_inputs_updated_at ON livestock_inputs;
CREATE TRIGGER trg_livestock_inputs_updated_at
  BEFORE UPDATE ON livestock_inputs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 23 — New table: field_sources (AI extraction audit)   ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS field_sources (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id            uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  document_id          uuid        NOT NULL REFERENCES documents(id)     ON DELETE CASCADE,
  table_name           text        NOT NULL,   -- 'clients' | 'rural_properties' | 'talhoes' | etc.
  field_name           text        NOT NULL,
  record_id            uuid        NOT NULL,   -- id of the row in table_name
  extracted_value      text,
  confidence           numeric(4,3),           -- 0.000–1.000
  manually_overridden  boolean     NOT NULL DEFAULT false,
  overridden_value     text,
  overridden_by        uuid        REFERENCES profiles(id),
  overridden_at        timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE field_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "field_sources_select" ON field_sources;
DROP POLICY IF EXISTS "field_sources_insert" ON field_sources;
DROP POLICY IF EXISTS "field_sources_update" ON field_sources;

CREATE POLICY "field_sources_select" ON field_sources FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "field_sources_insert" ON field_sources FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "field_sources_update" ON field_sources FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 24 — New tables: project_budget_items +               ║
-- ║            project_financing                                 ║
-- ╚══════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS project_budget_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_id    uuid        NOT NULL REFERENCES applications(id)  ON DELETE CASCADE,
  discriminacao     text        NOT NULL,
  unidade           text,
  quantidade        numeric(12,4),
  valor_unitario    numeric(14,4),
  valor_total       numeric(14,2),
  valor_financiado  numeric(14,2),
  recursos_proprios numeric(14,2),
  epoca             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_financing (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_id   uuid        NOT NULL REFERENCES applications(id)  ON DELETE CASCADE,
  finalidade       text,
  valor            numeric(14,2),
  data_contratacao date,
  vencimento       date,
  taxa_juros       numeric(6,3),
  cronograma       jsonb       DEFAULT '[]',   -- [{periodo, valor_parcela}]
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE project_budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_financing    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_budget_items_select" ON project_budget_items;
DROP POLICY IF EXISTS "project_budget_items_insert" ON project_budget_items;
DROP POLICY IF EXISTS "project_budget_items_update" ON project_budget_items;
DROP POLICY IF EXISTS "project_budget_items_delete" ON project_budget_items;

CREATE POLICY "project_budget_items_select" ON project_budget_items FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "project_budget_items_insert" ON project_budget_items FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "project_budget_items_update" ON project_budget_items FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "project_budget_items_delete" ON project_budget_items FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "project_financing_select" ON project_financing;
DROP POLICY IF EXISTS "project_financing_insert" ON project_financing;
DROP POLICY IF EXISTS "project_financing_update" ON project_financing;
DROP POLICY IF EXISTS "project_financing_delete" ON project_financing;

CREATE POLICY "project_financing_select" ON project_financing FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "project_financing_insert" ON project_financing FOR INSERT
  WITH CHECK (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "project_financing_update" ON project_financing FOR UPDATE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "project_financing_delete" ON project_financing FOR DELETE
  USING (organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid()));

DROP TRIGGER IF EXISTS trg_project_budget_items_updated_at ON project_budget_items;
CREATE TRIGGER trg_project_budget_items_updated_at
  BEFORE UPDATE ON project_budget_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_project_financing_updated_at ON project_financing;
CREATE TRIGGER trg_project_financing_updated_at
  BEFORE UPDATE ON project_financing
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 25 — Add snapshot column to applications              ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Full client+assets state freeze, populated at submission time.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS snapshot jsonb;


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 26 — Indexes                                          ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Fix missing org indexes on original 001 tables (full-table-scan risk at scale)
CREATE INDEX IF NOT EXISTS clients_org_idx        ON clients       (organization_id);
CREATE INDEX IF NOT EXISTS applications_org_idx   ON applications  (organization_id);
CREATE INDEX IF NOT EXISTS documents_client_idx   ON documents     (client_id);
CREATE INDEX IF NOT EXISTS documents_property_idx ON documents     (property_id);

-- client_bank_accounts
CREATE INDEX IF NOT EXISTS cba_client_idx ON client_bank_accounts (client_id);
CREATE UNIQUE INDEX IF NOT EXISTS cba_principal_idx
  ON client_bank_accounts (client_id, banco) WHERE principal = true;

-- rural_properties (spatial)
CREATE INDEX IF NOT EXISTS rural_properties_geom_idx ON rural_properties USING GIST (geometria);
CREATE INDEX IF NOT EXISTS rural_properties_ibge_idx ON rural_properties (municipio_ibge_code);

-- talhoes
CREATE INDEX IF NOT EXISTS talhoes_property_idx ON talhoes (property_id);
CREATE INDEX IF NOT EXISTS talhoes_client_idx   ON talhoes (client_id);
CREATE INDEX IF NOT EXISTS talhoes_geom_idx     ON talhoes USING GIST (geometria);

-- talhao_field_history
CREATE INDEX IF NOT EXISTS talhao_fh_talhao_idx   ON talhao_field_history (talhao_id);
CREATE INDEX IF NOT EXISTS talhao_fh_property_idx ON talhao_field_history (property_id);

-- crop_productions
CREATE INDEX IF NOT EXISTS cp_property_talhao_idx ON crop_productions (property_id, talhao_id);
CREATE INDEX IF NOT EXISTS cp_client_type_idx     ON crop_productions (client_id, production_type);
CREATE INDEX IF NOT EXISTS cp_client_ativ_safra_idx ON crop_productions (client_id, atividade, safra);
CREATE INDEX IF NOT EXISTS cp_ibge_idx            ON crop_productions (municipio_ibge_code);

-- crop_production_field_history
CREATE INDEX IF NOT EXISTS cpfh_production_idx ON crop_production_field_history (crop_production_id);
CREATE INDEX IF NOT EXISTS cpfh_client_field_idx ON crop_production_field_history (client_id, field_name);

-- livestock_productions
CREATE INDEX IF NOT EXISTS lp_property_talhao_idx ON livestock_productions (property_id, talhao_id);
CREATE INDEX IF NOT EXISTS lp_client_species_idx  ON livestock_productions (client_id, species_type);
CREATE INDEX IF NOT EXISTS lp_ibge_idx            ON livestock_productions (municipio_ibge_code);

-- livestock_production_field_history
CREATE INDEX IF NOT EXISTS lpfh_production_idx   ON livestock_production_field_history (livestock_production_id);
CREATE INDEX IF NOT EXISTS lpfh_client_field_idx ON livestock_production_field_history (client_id, field_name);

-- farm_overhead_costs
CREATE INDEX IF NOT EXISTS foc_client_ano_idx   ON farm_overhead_costs (client_id, ano_referencia);
CREATE INDEX IF NOT EXISTS foc_property_ano_idx ON farm_overhead_costs (property_id, ano_referencia);

-- production_systems
CREATE INDEX IF NOT EXISTS ps_client_idx  ON production_systems (client_id);
CREATE INDEX IF NOT EXISTS ps_talhao_idx  ON production_systems (talhao_id);

-- client_field_history
CREATE INDEX IF NOT EXISTS cfh_client_field_idx ON client_field_history (client_id, field_name);

-- property_field_history
CREATE INDEX IF NOT EXISTS pfh_property_idx ON property_field_history (property_id);
CREATE INDEX IF NOT EXISTS pfh_client_idx   ON property_field_history (client_id);

-- property_improvements
CREATE INDEX IF NOT EXISTS pi_property_ativo_idx ON property_improvements (property_id, ativo);

-- property_land_use
CREATE INDEX IF NOT EXISTS plu_property_ano_idx ON property_land_use (property_id, ano);

-- soil_analyses
CREATE INDEX IF NOT EXISTS sa_property_date_idx ON soil_analyses (property_id, data_coleta DESC);
CREATE INDEX IF NOT EXISTS sa_talhao_date_idx   ON soil_analyses (talhao_id,   data_coleta DESC);

-- property_imagery
CREATE INDEX IF NOT EXISTS pim_property_tipo_idx ON property_imagery (property_id, tipo);
CREATE INDEX IF NOT EXISTS pim_talhao_idx        ON property_imagery (talhao_id);

-- semoventes
CREATE INDEX IF NOT EXISTS sem_property_idx ON semoventes (property_id);

-- movable_assets
CREATE INDEX IF NOT EXISTS ma_property_idx ON movable_assets (property_id);

-- client_debts
CREATE INDEX IF NOT EXISTS cd_client_liquidada_idx ON client_debts (client_id, liquidada_em);

-- client_financial_profiles
CREATE UNIQUE INDEX IF NOT EXISTS cfp_client_ano_idx
  ON client_financial_profiles (client_id, ano_referencia);

-- bovino / suino / aves indices
CREATE INDEX IF NOT EXISTS bi_client_idx ON bovino_indices (client_id);
CREATE INDEX IF NOT EXISTS si_client_idx ON suino_indices  (client_id);
CREATE INDEX IF NOT EXISTS ai_client_idx ON aves_indices   (client_id);

-- crop_inputs / livestock_inputs
CREATE INDEX IF NOT EXISTS ci_production_idx ON crop_inputs      (crop_production_id);
CREATE INDEX IF NOT EXISTS li_production_idx ON livestock_inputs (livestock_production_id);

-- field_sources
CREATE INDEX IF NOT EXISTS fs_client_table_field_idx ON field_sources (client_id, table_name, field_name);
CREATE INDEX IF NOT EXISTS fs_document_idx           ON field_sources (document_id);

-- project_budget_items / project_financing
CREATE INDEX IF NOT EXISTS pbi_application_idx ON project_budget_items (application_id);
CREATE INDEX IF NOT EXISTS pf_application_idx  ON project_financing    (application_id);
