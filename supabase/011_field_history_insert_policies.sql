-- ════════════════════════════════════════════════════════════════
-- Migration 011 — Add INSERT policies to all field history tables
-- ════════════════════════════════════════════════════════════════
-- All 5 field history tables in 008 were created with SELECT-only
-- RLS policies. The AFTER UPDATE triggers on the parent tables
-- (clients, rural_properties, talhoes, crop_productions,
--  livestock_productions) fire INSERT statements into these tables,
-- which RLS blocks because no INSERT policy exists.
-- ════════════════════════════════════════════════════════════════

-- ── 1. client_field_history ──────────────────────────────────────
DROP POLICY IF EXISTS "client_field_history_insert" ON client_field_history;
CREATE POLICY "client_field_history_insert" ON client_field_history
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ── 2. property_field_history ─────────────────────────────────────
DROP POLICY IF EXISTS "property_field_history_insert" ON property_field_history;
CREATE POLICY "property_field_history_insert" ON property_field_history
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ── 3. talhao_field_history ───────────────────────────────────────
DROP POLICY IF EXISTS "talhao_field_history_insert" ON talhao_field_history;
CREATE POLICY "talhao_field_history_insert" ON talhao_field_history
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ── 4. crop_production_field_history ──────────────────────────────
DROP POLICY IF EXISTS "crop_production_field_history_insert" ON crop_production_field_history;
CREATE POLICY "crop_production_field_history_insert" ON crop_production_field_history
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ── 5. livestock_production_field_history ─────────────────────────
DROP POLICY IF EXISTS "livestock_production_field_history_insert" ON livestock_production_field_history;
CREATE POLICY "livestock_production_field_history_insert" ON livestock_production_field_history
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id FROM clients WHERE organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
