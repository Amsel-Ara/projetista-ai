-- ════════════════════════════════════════════════════════════════
-- Migration 010 — Fix profiles: assign org + update signup trigger
-- ════════════════════════════════════════════════════════════════
-- Root cause: handle_new_user() trigger (001) creates profiles with
-- organization_id = NULL. Existing users have no org assignment, so
-- all RLS policies that check organization_id fail on INSERT.
--
-- The seed org 'a0000000-0000-0000-0000-000000000001' exists from 001.
-- This migration backfills all orphaned profiles and fixes the trigger.
-- ════════════════════════════════════════════════════════════════

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 1 — Backfill existing profiles with seed org          ║
-- ╚══════════════════════════════════════════════════════════════╝
UPDATE profiles
SET organization_id = 'a0000000-0000-0000-0000-000000000001'
WHERE organization_id IS NULL;

-- ╔══════════════════════════════════════════════════════════════╗
-- ║  STEP 2 — Fix handle_new_user trigger                        ║
-- ╚══════════════════════════════════════════════════════════════╝
-- Now auto-assigns every new signup to the seed org.
-- In a multi-tenant future, replace with CREATE org → INSERT profile.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, organization_id, full_name, role)
  VALUES (
    new.id,
    'a0000000-0000-0000-0000-000000000001',
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE(new.raw_user_meta_data->>'role', 'team_member')
  )
  ON CONFLICT (id) DO UPDATE
    SET organization_id = COALESCE(
      profiles.organization_id,
      'a0000000-0000-0000-0000-000000000001'
    );
  RETURN new;
END;
$$;
