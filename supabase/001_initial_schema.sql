-- ============================================================
-- Projetista.Ai — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── 1. Organizations (tenants) ───────────────────────────────
create table if not exists organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  created_at timestamptz default now()
);

-- ── 2. Profiles (extends auth.users) ────────────────────────
create table if not exists profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  organization_id  uuid references organizations(id),
  full_name        text,
  role             text check (role in ('admin', 'team_member')) default 'team_member',
  created_at       timestamptz default now()
);

-- Auto-create profile when a new auth user is created
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'team_member')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── 3. Clients ───────────────────────────────────────────────
create table if not exists clients (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id) not null,
  name             text not null,
  cpf              text,
  whatsapp         text,
  email            text,
  city             text,
  state            text,
  farm_name        text,
  farm_address     text,
  status           text check (status in (
    'Ativo', 'Em análise', 'Aprovado', 'Inativo'
  )) default 'Ativo',
  assigned_to      uuid references profiles(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── 4. Applications ──────────────────────────────────────────
create table if not exists applications (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references clients(id) on delete cascade not null,
  organization_id  uuid references organizations(id) not null,
  loan_type        text not null,
  bank             text,
  amount           numeric(14,2),
  commission_pct   numeric(5,2),
  status           text check (status in (
    'Rascunho',
    'Documentos pendentes',
    'Em análise',
    'Formulário gerado',
    'Enviado',
    'Aprovado'
  )) default 'Rascunho',
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── 5. Documents ─────────────────────────────────────────────
create table if not exists documents (
  id               uuid primary key default gen_random_uuid(),
  application_id   uuid references applications(id) on delete cascade not null,
  organization_id  uuid references organizations(id) not null,
  doc_type         text not null,
  file_path        text not null,
  file_name        text,
  file_size        integer,
  expiry_date      date,
  status           text check (status in (
    'pending', 'processing', 'completed', 'failed'
  )) default 'pending',
  uploaded_by      uuid references profiles(id),
  created_at       timestamptz default now()
);

-- ── 6. Extracted Fields (AI output) ─────────────────────────
create table if not exists extracted_fields (
  id               uuid primary key default gen_random_uuid(),
  document_id      uuid references documents(id) on delete cascade unique not null,
  fields           jsonb,
  manually_edited  boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── 7. Notifications ─────────────────────────────────────────
create table if not exists notifications (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id) not null,
  user_id          uuid references profiles(id),
  title            text not null,
  body             text,
  is_read          boolean default false,
  created_at       timestamptz default now()
);

-- ── 8. Chat Messages ─────────────────────────────────────────
create table if not exists chat_messages (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references organizations(id) not null,
  user_id          uuid references profiles(id),
  role             text check (role in ('user', 'assistant')) not null,
  content          text not null,
  created_at       timestamptz default now()
);

-- ── 9. Seed: default organization ────────────────────────────
-- Creates the first org. Run once, then assign users to it.
insert into organizations (id, name, slug)
values (
  'a0000000-0000-0000-0000-000000000001',
  'Projetista.Ai',
  'projetista-ai'
)
on conflict (slug) do nothing;

-- ── 10. Helper: updated_at trigger ───────────────────────────
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_updated_at
  before update on clients
  for each row execute procedure set_updated_at();

create trigger applications_updated_at
  before update on applications
  for each row execute procedure set_updated_at();

create trigger extracted_fields_updated_at
  before update on extracted_fields
  for each row execute procedure set_updated_at();
