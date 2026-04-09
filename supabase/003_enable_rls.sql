-- ============================================================
-- Projetista.Ai — Enable RLS on all public tables
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Helper: returns the authenticated user's organization_id ─
-- Used in every policy to scope access to the user's tenant.
-- SECURITY DEFINER so it can read profiles even after RLS is on.
create or replace function auth.org_id()
returns uuid
language sql
security definer
stable
as $$
  select organization_id from public.profiles where id = auth.uid()
$$;

-- ── 1. profiles ──────────────────────────────────────────────
alter table profiles enable row level security;

-- Users can always read their own profile (needed for onboarding
-- before an org is assigned) and read all profiles in their org.
create policy "profiles: select"
  on profiles for select
  using (id = auth.uid() or organization_id = auth.org_id());

-- Users can only update their own profile row.
create policy "profiles: update own"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- INSERT is handled exclusively by the handle_new_user trigger
-- (SECURITY DEFINER), which bypasses RLS — no INSERT policy needed.

-- ── 2. organizations ─────────────────────────────────────────
alter table organizations enable row level security;

create policy "organizations: select own"
  on organizations for select
  using (id = auth.org_id());

-- Org records are managed via Supabase dashboard / migrations,
-- not by end-users, so no INSERT/UPDATE/DELETE policies.

-- ── 3. clients ───────────────────────────────────────────────
alter table clients enable row level security;

create policy "clients: all within org"
  on clients for all
  using (organization_id = auth.org_id())
  with check (organization_id = auth.org_id());

-- ── 4. applications ──────────────────────────────────────────
alter table applications enable row level security;

create policy "applications: all within org"
  on applications for all
  using (organization_id = auth.org_id())
  with check (organization_id = auth.org_id());

-- ── 5. documents ─────────────────────────────────────────────
alter table documents enable row level security;

create policy "documents: all within org"
  on documents for all
  using (organization_id = auth.org_id())
  with check (organization_id = auth.org_id());

-- ── 6. extracted_fields ──────────────────────────────────────
-- No organization_id column — scope via parent document's org.
alter table extracted_fields enable row level security;

create policy "extracted_fields: all within org"
  on extracted_fields for all
  using (
    document_id in (
      select id from documents where organization_id = auth.org_id()
    )
  )
  with check (
    document_id in (
      select id from documents where organization_id = auth.org_id()
    )
  );

-- ── 7. notifications ─────────────────────────────────────────
alter table notifications enable row level security;

-- Notifications are org-scoped and optionally user-specific.
create policy "notifications: select own"
  on notifications for select
  using (
    organization_id = auth.org_id()
    and (user_id is null or user_id = auth.uid())
  );

create policy "notifications: update own"
  on notifications for update
  using (
    organization_id = auth.org_id()
    and (user_id is null or user_id = auth.uid())
  )
  with check (organization_id = auth.org_id());

create policy "notifications: insert within org"
  on notifications for insert
  with check (organization_id = auth.org_id());

-- ── 8. chat_messages ─────────────────────────────────────────
alter table chat_messages enable row level security;

create policy "chat_messages: all within org"
  on chat_messages for all
  using (organization_id = auth.org_id())
  with check (organization_id = auth.org_id());
