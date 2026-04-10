-- ════════════════════════════════════════════════════════════
-- Migration 006 — RG/CPF expiry tracking
-- ════════════════════════════════════════════════════════════
-- The new Brazilian National Identity (Identidade Nacional / CIN),
-- introduced in 2023, carries an explicit expiry date:
--   < 12 years old → 5 years
--   12–60 years    → 10 years
--   > 60 years     → does not expire
--
-- Old-format RGs have no expiry date. For those, we use
-- validity_days = 3650 (10 years from issue date) as a
-- conservative fallback that Claude Vision will override
-- whenever it finds an explicit date printed on the document.
-- ════════════════════════════════════════════════════════════

-- 1. Mark rg_cpf as an expiring document type
UPDATE doc_types
SET has_expiry = true
WHERE doc_key = 'rg_cpf';

-- 2. Set validity_days = 3650 (10 years) for all programs
--    that require rg_cpf (bank IS NULL = MCR requirement shared by all banks)
UPDATE program_doc_requirements
SET validity_days = 3650
WHERE doc_key = 'rg_cpf'
  AND bank IS NULL;

-- ── Done. Run this in the Supabase SQL Editor. ───────────────
