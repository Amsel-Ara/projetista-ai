-- ════════════════════════════════════════════════════════════════
-- Migration 013 — Add missing herd quantity columns to livestock_productions
-- ════════════════════════════════════════════════════════════════
-- Migration 008 added species_type, property_id, cost/revenue columns
-- but omitted the basic herd composition fields that the UI collects
-- on the Nova Atividade Pecuária create form.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE livestock_productions
  ADD COLUMN IF NOT EXISTS qtd_total     integer,
  ADD COLUMN IF NOT EXISTS qtd_vacas     integer,
  ADD COLUMN IF NOT EXISTS qtd_touros    integer,
  ADD COLUMN IF NOT EXISTS qtd_novilhas  integer,
  ADD COLUMN IF NOT EXISTS qtd_bezerros  integer;
