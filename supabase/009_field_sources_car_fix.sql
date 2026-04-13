-- ════════════════════════════════════════════════════════════════
-- Migration 009 — field_sources extension + CAR constraint fix
-- ════════════════════════════════════════════════════════════════
-- Run order: 007 → 008 → 009
-- All statements are idempotent (IF EXISTS / IF NOT EXISTS guards).
-- ════════════════════════════════════════════════════════════════


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 1 — Extend field_sources for full data origin tracking ║
-- ╚══════════════════════════════════════════════════════════════╝

ALTER TABLE field_sources
  ALTER COLUMN document_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS tipo       text        NOT NULL DEFAULT 'ai_extraction'
    CHECK (tipo IN ('ai_extraction', 'api_lookup', 'manual', 'system')),
  ADD COLUMN IF NOT EXISTS api_source text,        -- 'viacep' | 'receita_federal' | 'sicar' | 'ibge' | etc.
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Guard: ai_extraction must have a document_id
ALTER TABLE field_sources
  DROP CONSTRAINT IF EXISTS field_sources_ai_requires_doc;

ALTER TABLE field_sources
  ADD CONSTRAINT field_sources_ai_requires_doc
    CHECK (tipo != 'ai_extraction' OR document_id IS NOT NULL);

DROP TRIGGER IF EXISTS trg_field_sources_updated_at ON field_sources;
CREATE TRIGGER trg_field_sources_updated_at
  BEFORE UPDATE ON field_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Index for provenance queries per field
CREATE INDEX IF NOT EXISTS field_sources_record_field_idx
  ON field_sources (table_name, record_id, field_name, created_at DESC);


-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 2 — Fix car_status CHECK constraint                    ║
-- ╚══════════════════════════════════════════════════════════════╝
-- ADD COLUMN IF NOT EXISTS in 008 silently skipped the CHECK constraint
-- if the column already existed. Fix with an explicit named constraint.
-- Also adds the missing real SICAR status 'Em análise'.

ALTER TABLE rural_properties
  DROP CONSTRAINT IF EXISTS rural_properties_car_status_check;

ALTER TABLE rural_properties
  ADD CONSTRAINT rural_properties_car_status_check
    CHECK (car_status IS NULL OR car_status IN (
      'Ativo', 'Em análise', 'Pendente', 'Suspenso', 'Cancelado'
    ));
