-- ════════════════════════════════════════════════════════════════
-- Migration 012 — Rebuild audit trigger functions as SECURITY DEFINER
-- ════════════════════════════════════════════════════════════════
-- Problem: trigger functions that INSERT into *_field_history tables
-- run in the caller's session context. In Supabase/PostgREST,
-- auth.uid() can return NULL inside trigger bodies, causing the
-- RLS INSERT policy (which checks auth.uid()) to evaluate to FALSE
-- and block every audit write.
--
-- Fix: SECURITY DEFINER makes the function run as its owner (postgres),
-- which is a superuser that bypasses RLS. This is the standard pattern
-- for audit/history triggers — the function itself enforces what gets
-- written; RLS on the history table only needs to protect SELECT.
-- ════════════════════════════════════════════════════════════════

-- ── 1. client_field_history trigger ─────────────────────────────
CREATE OR REPLACE FUNCTION log_client_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  k        text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(new_json) LOOP
    CONTINUE WHEN k IN ('updated_at', 'created_at');
    CONTINUE WHEN old_json->>k IS NOT DISTINCT FROM new_json->>k;
    INSERT INTO client_field_history (client_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, k, old_json->>k, new_json->>k, auth.uid());
  END LOOP;
  RETURN NEW;
END;
$$;

-- ── 2. property_field_history trigger ────────────────────────────
CREATE OR REPLACE FUNCTION log_property_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  k        text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(new_json) LOOP
    CONTINUE WHEN k IN ('updated_at', 'created_at');
    CONTINUE WHEN old_json->>k IS NOT DISTINCT FROM new_json->>k;
    INSERT INTO property_field_history (property_id, client_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.client_id, k, old_json->>k, new_json->>k, auth.uid());
  END LOOP;
  RETURN NEW;
END;
$$;

-- ── 3. talhao_field_history trigger ──────────────────────────────
CREATE OR REPLACE FUNCTION log_talhao_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  k        text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(new_json) LOOP
    CONTINUE WHEN k IN ('updated_at', 'created_at');
    CONTINUE WHEN old_json->>k IS NOT DISTINCT FROM new_json->>k;
    INSERT INTO talhao_field_history
      (talhao_id, client_id, property_id, field_name, old_value, new_value, changed_by)
    VALUES
      (NEW.id, NEW.client_id, NEW.property_id, k, old_json->>k, new_json->>k, auth.uid());
  END LOOP;
  RETURN NEW;
END;
$$;

-- ── 4. crop_production_field_history trigger ──────────────────────
CREATE OR REPLACE FUNCTION log_crop_production_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  k        text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(new_json) LOOP
    CONTINUE WHEN k IN ('updated_at', 'created_at');
    CONTINUE WHEN old_json->>k IS NOT DISTINCT FROM new_json->>k;
    INSERT INTO crop_production_field_history
      (crop_production_id, client_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.client_id, k, old_json->>k, new_json->>k, auth.uid());
  END LOOP;
  RETURN NEW;
END;
$$;

-- ── 5. livestock_production_field_history trigger ─────────────────
CREATE OR REPLACE FUNCTION log_livestock_production_field_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  k        text;
BEGIN
  FOR k IN SELECT jsonb_object_keys(new_json) LOOP
    CONTINUE WHEN k IN ('updated_at', 'created_at');
    CONTINUE WHEN old_json->>k IS NOT DISTINCT FROM new_json->>k;
    INSERT INTO livestock_production_field_history
      (livestock_production_id, client_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.client_id, k, old_json->>k, new_json->>k, auth.uid());
  END LOOP;
  RETURN NEW;
END;
$$;
