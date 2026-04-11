-- ════════════════════════════════════════════════════════════
-- Migration 006 — Pessoa & Contato + Imóvel Rural
-- ════════════════════════════════════════════════════════════
-- Extends the clients table with fields required for loan
-- applications (personal data, address, contact source).
-- Creates the rural_properties table for 1:many farm records.
-- ════════════════════════════════════════════════════════════

-- ── 1. Extend clients table ───────────────────────────────────
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS cnpj             text,
  ADD COLUMN IF NOT EXISTS razao_social     text,
  ADD COLUMN IF NOT EXISTS cnae             text,
  ADD COLUMN IF NOT EXISTS natureza_juridica text,
  ADD COLUMN IF NOT EXISTS date_of_birth    date,
  ADD COLUMN IF NOT EXISTS cpf_status       text,
  ADD COLUMN IF NOT EXISTS cep              text,
  ADD COLUMN IF NOT EXISTS logradouro       text,
  ADD COLUMN IF NOT EXISTS numero           text,
  ADD COLUMN IF NOT EXISTS complemento      text,
  ADD COLUMN IF NOT EXISTS bairro           text,
  ADD COLUMN IF NOT EXISTS ibge_code        text,
  ADD COLUMN IF NOT EXISTS como_conheceu    text;

-- ── 2. Create rural_properties table ─────────────────────────
CREATE TABLE IF NOT EXISTS rural_properties (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id           uuid NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,

  -- Identification / NIRF (Receita Federal)
  nirf                text,
  nome                text,              -- property/farm name
  municipio           text,
  uf                  text,
  area_declarada_ha   numeric(12,4),

  -- CAR / SICAR
  car_numero          text,
  car_status          text,
  car_area_ha         numeric(12,4),

  -- CCIR / INCRA (SNCR code)
  ccir                text,
  ccir_situacao       text,
  ccir_area_ha        numeric(12,4),

  -- Situação Fundiária
  condicao_produtor   text,              -- Proprietário, Arrendatário, Posseiro, Parceiro/Meeiro, Comodatário
  atividade_principal text,              -- Agricultura, Pecuária, etc.
  caf_dap             text,

  -- Meta
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── 3. RLS for rural_properties ───────────────────────────────
ALTER TABLE rural_properties ENABLE ROW LEVEL SECURITY;

-- Drop first so the script is safe to re-run
DROP POLICY IF EXISTS "rural_properties_select" ON rural_properties;
DROP POLICY IF EXISTS "rural_properties_insert" ON rural_properties;
DROP POLICY IF EXISTS "rural_properties_update" ON rural_properties;
DROP POLICY IF EXISTS "rural_properties_delete" ON rural_properties;

-- Users can read their own organisation's properties
CREATE POLICY "rural_properties_select"
  ON rural_properties FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can insert properties into their own organisation
CREATE POLICY "rural_properties_insert"
  ON rural_properties FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can update their own organisation's properties
CREATE POLICY "rural_properties_update"
  ON rural_properties FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Users can delete their own organisation's properties
CREATE POLICY "rural_properties_delete"
  ON rural_properties FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ── 4. Auto-update updated_at on rural_properties ─────────────
CREATE OR REPLACE FUNCTION update_rural_properties_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rural_properties_updated_at ON rural_properties;
CREATE TRIGGER trg_rural_properties_updated_at
  BEFORE UPDATE ON rural_properties
  FOR EACH ROW EXECUTE FUNCTION update_rural_properties_updated_at();
