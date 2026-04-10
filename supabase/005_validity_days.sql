-- ════════════════════════════════════════════════════════════
-- Migration 005 — Add validity_days to program_doc_requirements
-- ════════════════════════════════════════════════════════════
-- validity_days: number of days a document is considered valid
-- from its issue date. NULL means the document either:
--   a) has an explicit expiry date printed on it (e.g., CAR, licença ambiental), OR
--   b) does not expire
-- When validity_days IS NOT NULL, the system calculates:
--   effective_expiry = issue_date + validity_days
-- ════════════════════════════════════════════════════════════

ALTER TABLE program_doc_requirements
  ADD COLUMN IF NOT EXISTS validity_days integer;

-- ────────────────────────────────────────────────────────────
-- Seed: Banco do Brasil validity periods (Safra 2025/2026)
-- These apply to BB-scoped requirements (bank = 'banco_do_brasil')
-- MCR requirements (bank IS NULL) get no validity_days here
-- because each bank sets their own acceptance window.
-- ────────────────────────────────────────────────────────────

-- Matrícula atualizada: BB requires issued within 30 days
UPDATE program_doc_requirements
SET validity_days = 30
WHERE doc_key = 'matricula'
  AND bank = 'banco_do_brasil';

-- CCIR: annual document, valid for the fiscal year (≈365 days)
UPDATE program_doc_requirements
SET validity_days = 365
WHERE doc_key = 'ccir'
  AND bank = 'banco_do_brasil';

-- ITR: annual, valid for the fiscal year
UPDATE program_doc_requirements
SET validity_days = 365
WHERE doc_key = 'itr'
  AND bank = 'banco_do_brasil';

-- CAF (ex-DAP): typically valid 1 year
UPDATE program_doc_requirements
SET validity_days = 365
WHERE doc_key = 'caf'
  AND bank = 'banco_do_brasil';

-- Comprovante de residência: BB typically requires within 90 days
UPDATE program_doc_requirements
SET validity_days = 90
WHERE doc_key = 'comprov_residencia'
  AND bank = 'banco_do_brasil';

-- Certidão de ônus reais: BB requires within 30 days
UPDATE program_doc_requirements
SET validity_days = 30
WHERE doc_key = 'certidao_onus'
  AND bank = 'banco_do_brasil';

-- Análise de solo: valid for 2 years (730 days)
UPDATE program_doc_requirements
SET validity_days = 730
WHERE doc_key = 'analise_solo'
  AND bank = 'banco_do_brasil';

-- Ficha sanitária do rebanho: valid for 1 year
UPDATE program_doc_requirements
SET validity_days = 365
WHERE doc_key = 'ficha_sanitaria'
  AND bank = 'banco_do_brasil';

-- Contrato de arrendamento: has its own explicit expiry (validity_days = NULL, let Claude extract)
-- Licença ambiental: has explicit expiry on the document (validity_days = NULL)
-- Outorga d'água: has explicit expiry on the document (validity_days = NULL)
-- Apólice de seguro: has explicit expiry on the document (validity_days = NULL)

-- ────────────────────────────────────────────────────────────
-- Done. Run this in the Supabase SQL Editor.
-- ────────────────────────────────────────────────────────────
