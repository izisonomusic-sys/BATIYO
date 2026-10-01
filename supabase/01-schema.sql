-- =============================================================================
-- BATIYO — SCHÉMA DE BASE DE DONNÉES (PostgreSQL / Supabase)
-- -----------------------------------------------------------------------------
-- À exécuter dans l'ordre : 01-schema.sql → 02-rls.sql → 03-functions.sql
-- → 04-reference.sql
--
-- Principes (#85 → #88, #226, #243) :
--   • multi-entreprises : chaque ligne métier porte `business_id` ;
--   • champs de synchronisation : created_at, updated_at, deleted_at,
--     sync_status, local_id, remote_id, created_by, updated_by ;
--   • suppression logique (deleted_at) : aucune donnée n'est effacée brutalement ;
--   • les montants sont en numeric(14,2) — jamais en flottant (#103) ;
--   • les lignes de devis/facture sont figées (copie du libellé, du prix,
--     de l'unité) : modifier le catalogue ne change pas un document passé (#263).
-- =============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()
create extension if not exists "citext";

-- =============================================================================
-- 0. TYPES
-- =============================================================================
do $$ begin
  create type sync_state as enum ('local', 'synced', 'pending', 'error');
exception when duplicate_object then null; end $$;

-- =============================================================================
-- 1. RÉFÉRENTIEL (données partagées, non modifiables par les entreprises)
-- =============================================================================
create table if not exists professions (
  code            text primary key,                    -- 'maçon', 'plombier' (#16)
  name            text not null,
  icon            text,
  tags            text[] default '{}',
  catalog         jsonb not null default '[]'::jsonb,  -- articles par défaut
  templates       jsonb not null default '[]'::jsonb,  -- modèles de devis (#189)
  budget_profile  jsonb not null default '{}'::jsonb,  -- répartition budgétaire conseillée
  active          boolean not null default true,
  position        int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists catalog_categories (
  code       text primary key,                          -- 'materiaux', 'main_oeuvre'…
  label      text not null,
  position   int not null default 0
);

create table if not exists expense_categories (
  code       text primary key,
  label      text not null,
  color      text,
  position   int not null default 0
);

create table if not exists units (
  code       text primary key,                          -- 'sac', 'barre', 'voyage'…
  label      text not null,
  position   int not null default 0
);

-- =============================================================================
-- 2. ENTREPRISES, PROFILS, PARAMÈTRES
-- =============================================================================
create table if not exists businesses (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text,
  email         citext,
  address       text,
  manager_name  text,
  country       text default 'TG',
  currency      text not null default 'FCFA',
  logo_url      text,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  deleted_at    timestamptz,
  sync_status   sync_state not null default 'synced',
  local_id      text,
  remote_id     text
);

-- Un profil par utilisateur : c'est le rattachement à l'entreprise et au métier
create table if not exists profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  business_id    uuid not null references businesses (id) on delete restrict,
  profession_id  text references professions (code),
  full_name      text,
  phone          text,
  email          citext,
  address        text,
  avatar_url     text,
  role           text not null default 'proprietaire',  -- proprietaire | employe | comptable
  language       text not null default 'fr',
  preferences    jsonb not null default '{"notifications": true, "currency": "FCFA"}'::jsonb,
  onboarding_done boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid,
  updated_by     uuid,
  deleted_at     timestamptz,
  sync_status    sync_state not null default 'synced',
  local_id       text,
  remote_id      text
);
create index if not exists profiles_business_idx on profiles (business_id);

-- Paramètres d'une entreprise (#174, #240) — une ligne par entreprise
create table if not exists settings (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null unique references businesses (id) on delete cascade,
  currency          text not null default 'FCFA',
  language          text not null default 'fr',
  date_format       text not null default 'dd/mm/yyyy',
  tax_enabled       boolean not null default false,      -- aucune règle fiscale imposée (#37)
  tax_name          text default 'TVA',
  tax_rate          numeric(6,3) not null default 18,
  tax_mode          text not null default 'exclusive' check (tax_mode in ('exclusive', 'inclusive')),
  quote_prefix      text not null default 'DEV',
  invoice_prefix    text not null default 'FAC',
  project_prefix    text not null default 'CH',
  expense_prefix    text not null default 'DEP',
  numbering_style   text not null default 'year' check (numbering_style in ('year', 'plain')),
  document_footer   text,
  payment_terms     text,
  valid_days        int not null default 30,
  notifications     jsonb not null default '{"budget": true, "documents": true, "assistant": true}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid,
  updated_by        uuid,
  deleted_at        timestamptz,
  sync_status       sync_state not null default 'synced',
  local_id          text,
  remote_id         text
);

-- =============================================================================
-- 3. CLIENTS (#78, #79)
-- =============================================================================
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name        text not null,
  phone       text,
  email       citext,
  address     text,
  notes       text,
  favorite    boolean not null default false,
  tags        text[] default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz,
  sync_status sync_state not null default 'synced',
  local_id    text,
  remote_id   text
);
create index if not exists clients_business_idx on clients (business_id) where deleted_at is null;
create index if not exists clients_search_idx on clients using gin (to_tsvector('french', coalesce(name, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(address, '')));

-- =============================================================================
-- 4. CATALOGUE (#72 → #77)
--    business_id NULL = article du modèle fourni par BATIYO pour un métier.
--    Les modifications d'un article ne touchent jamais un document existant.
-- =============================================================================
create table if not exists catalog_items (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid references businesses (id) on delete cascade,   -- NULL = modèle global
  profession_id text references professions (code),
  name          text not null,
  description   text default '',
  unit          text not null default 'unité',
  default_price numeric(14,2) not null default 0 check (default_price >= 0),
  category      text not null default 'materiaux',
  favorite      boolean not null default false,
  keywords      text default '',
  usage_count   int not null default 0,
  last_price    numeric(14,2),
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  deleted_at    timestamptz,
  sync_status   sync_state not null default 'synced',
  local_id      text,
  remote_id     text,
  constraint catalog_item_scope check (business_id is not null or profession_id is not null)
);
create index if not exists catalog_items_scope_idx on catalog_items (business_id, profession_id) where deleted_at is null;
-- Un article modèle (business_id NULL) est identifié par son local_id : le
-- référentiel peut ainsi être rejoué sans créer de doublons.
create unique index if not exists catalog_items_template_uidx on catalog_items (local_id) where business_id is null;
create index if not exists catalog_items_fts_idx on catalog_items using gin (to_tsvector('french', coalesce(name, '') || ' ' || coalesce(keywords, '')));

-- =============================================================================
-- 5. CHANTIERS (#47, #48, #50)
-- =============================================================================
create table if not exists projects (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references businesses (id) on delete cascade,
  client_id       uuid references clients (id) on delete set null,
  quote_id        uuid,
  name            text not null,
  address         text,
  description     text,
  status          text not null default 'en_cours'
                  check (status in ('planifie', 'en_cours', 'termine', 'archive')),
  quote_total     numeric(14,2) not null default 0,      -- montant du contrat
  budget          jsonb not null default '{}'::jsonb,     -- budget prévu par poste
  baseline_margin numeric(14,2) not null default 0,       -- marge prévisionnelle de départ
  progress        int not null default 0 check (progress between 0 and 100),
  start_date      date,
  end_date        date,
  notes           text,
  archived        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid,
  updated_by      uuid,
  deleted_at      timestamptz,
  sync_status     sync_state not null default 'synced',
  local_id        text,
  remote_id       text
);
create index if not exists projects_business_idx on projects (business_id) where deleted_at is null;
create index if not exists projects_client_idx on projects (client_id);

-- =============================================================================
-- 6. DEVIS (#24 → #32) — en-tête + lignes figées
-- =============================================================================
create table if not exists quotes (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  client_id    uuid references clients (id) on delete set null,
  project_id   uuid references projects (id) on delete set null,
  number       text not null,                            -- DEV-2026-0001 (#105)
  profession_id text references professions (code),      -- métier au moment du devis
  status       text not null default 'brouillon'
               check (status in ('brouillon', 'envoye', 'vu', 'accepte', 'refuse', 'expire', 'converti')),
  date         date not null default current_date,
  valid_until  date,
  subtotal     numeric(14,2) not null default 0,
  discount     jsonb not null default '{"mode": "amount", "value": 0}'::jsonb,
  tax          numeric(14,2) not null default 0,
  tax_label    text,
  total        numeric(14,2) not null default 0,
  deposit      numeric(14,2) not null default 0,         -- acompte demandé
  balance      numeric(14,2) not null default 0,
  notes        text,
  conditions   text,
  reference    text,
  version      int not null default 1,
  timeline     jsonb not null default '[]'::jsonb,
  sent_at      timestamptz,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  deleted_at   timestamptz,
  sync_status  sync_state not null default 'synced',
  local_id     text,
  remote_id    text,
  unique (business_id, number)
);
create index if not exists quotes_business_idx on quotes (business_id, status) where deleted_at is null;
create index if not exists quotes_client_idx on quotes (client_id);

create table if not exists quote_items (
  id             uuid primary key default gen_random_uuid(),
  quote_id       uuid not null references quotes (id) on delete cascade,
  business_id    uuid not null references businesses (id) on delete cascade,
  position       int not null default 0,
  catalog_item_id uuid references catalog_items (id) on delete set null,
  description    text not null,                          -- copie figée (#263)
  quantity       numeric(14,3) not null default 1,
  unit           text not null default 'unité',
  unit_price     numeric(14,2) not null default 0,
  line_total     numeric(14,2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  constraint quote_item_qty_positive check (quantity >= 0 and unit_price >= 0)
);
create index if not exists quote_items_quote_idx on quote_items (quote_id);

-- =============================================================================
-- 7. FACTURES + PAIEMENTS MANUELS (#45, #269 → #272)
--    Aucun paiement en ligne : uniquement des montants saisis (#120, #273).
-- =============================================================================
create table if not exists invoices (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  client_id    uuid references clients (id) on delete set null,
  project_id   uuid references projects (id) on delete set null,
  quote_id     uuid references quotes (id) on delete set null,   -- traçabilité de la conversion (#265)
  number       text not null,                                    -- FAC-2026-0001
  status       text not null default 'brouillon'
               check (status in ('brouillon', 'envoyee', 'partielle', 'payee', 'en_retard', 'annulee')),
  date         date not null default current_date,
  due_date     date,
  subtotal     numeric(14,2) not null default 0,
  discount     jsonb not null default '{"mode": "amount", "value": 0}'::jsonb,
  tax          numeric(14,2) not null default 0,
  tax_label    text,
  total        numeric(14,2) not null default 0,
  paid_amount  numeric(14,2) not null default 0 check (paid_amount >= 0),
  notes        text,
  conditions   text,
  version      int not null default 1,
  timeline     jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  deleted_at   timestamptz,
  sync_status  sync_state not null default 'synced',
  local_id     text,
  remote_id    text,
  unique (business_id, number)
);
create index if not exists invoices_business_idx on invoices (business_id, status) where deleted_at is null;

create table if not exists invoice_items (
  id             uuid primary key default gen_random_uuid(),
  invoice_id     uuid not null references invoices (id) on delete cascade,
  business_id    uuid not null references businesses (id) on delete cascade,
  position       int not null default 0,
  catalog_item_id uuid references catalog_items (id) on delete set null,
  description    text not null,
  quantity       numeric(14,3) not null default 1,
  unit           text not null default 'unité',
  unit_price     numeric(14,2) not null default 0,
  line_total     numeric(14,2) not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index if not exists invoice_items_invoice_idx on invoice_items (invoice_id);

create table if not exists payments (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  invoice_id  uuid not null references invoices (id) on delete cascade,
  amount      numeric(14,2) not null check (amount > 0),
  date        date not null default current_date,
  method      text,                       -- Espèces, Mobile Money (saisi à la main), Virement…
  reference   text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz,
  sync_status sync_state not null default 'synced',
  local_id    text,
  remote_id   text
);
create index if not exists payments_invoice_idx on payments (invoice_id);
create index if not exists payments_business_idx on payments (business_id, date);

-- =============================================================================
-- 8. DÉPENSES (#51 → #59, #195)
-- =============================================================================
create table if not exists expenses (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references businesses (id) on delete cascade,
  project_id    uuid references projects (id) on delete set null,
  number        text,                                  -- DEP-2026-0001
  category      text not null default 'materiaux',
  budget_line   text,                                  -- ciment, fer, sable, main_oeuvre…
  amount        numeric(14,2) not null check (amount >= 0),
  description   text not null default '',
  date          date not null default current_date,
  supplier_id   uuid,
  supplier_name text,
  receipt_url   text,                                  -- photo du reçu (bucket `receipts`)
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid,
  updated_by    uuid,
  deleted_at    timestamptz,
  sync_status   sync_state not null default 'synced',
  local_id      text,
  remote_id     text
);
create index if not exists expenses_business_idx on expenses (business_id, date) where deleted_at is null;
create index if not exists expenses_project_idx on expenses (project_id) where deleted_at is null;

-- =============================================================================
-- 9. DOCUMENTS, PHOTOS, NOTIFICATIONS, ASSISTANT
-- =============================================================================
create table if not exists documents (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  type         text not null default 'quote' check (type in ('quote', 'invoice', 'receipt', 'photo', 'contract', 'other')),
  reference_id uuid,
  number       text,
  title        text,
  amount       numeric(14,2),
  date         date default current_date,
  file_type    text default 'pdf',
  file_url     text,
  generated    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  deleted_at   timestamptz,
  sync_status  sync_state not null default 'synced',
  local_id     text,
  remote_id    text
);
create index if not exists documents_business_idx on documents (business_id, type) where deleted_at is null;

create table if not exists photos (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  project_id  uuid references projects (id) on delete cascade,
  expense_id  uuid references expenses (id) on delete set null,
  type        text not null default 'chantier' check (type in ('chantier', 'recu', 'devis', 'autre')),
  title       text,
  file_url    text not null,
  taken_at    timestamptz default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz,
  sync_status sync_state not null default 'synced',
  local_id    text,
  remote_id   text
);
create index if not exists photos_project_idx on photos (project_id) where deleted_at is null;

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  profile_id  uuid references profiles (id) on delete cascade,
  type        text not null default 'systeme',
  title       text not null,
  message     text,
  link        text,
  payload     jsonb default '{}'::jsonb,
  read        boolean not null default false,
  date        date default current_date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  sync_status sync_state not null default 'synced',
  local_id    text,
  remote_id   text
);
create index if not exists notifications_unread_idx on notifications (business_id, read) where deleted_at is null;

create table if not exists assistant_messages (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  profile_id  uuid references profiles (id) on delete set null,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  meta        jsonb default '{}'::jsonb,     -- intention détectée, action proposée…
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  sync_status sync_state not null default 'synced',
  local_id    text,
  remote_id   text
);
create index if not exists assistant_messages_business_idx on assistant_messages (business_id, created_at);

-- =============================================================================
-- 10. FOURNISSEURS ET ACHATS (préparés — #201, #202)
-- =============================================================================
create table if not exists suppliers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  name        text not null,
  phone       text,
  address     text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz,
  sync_status sync_state not null default 'synced',
  local_id    text,
  remote_id   text
);

create table if not exists purchases (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  supplier_id  uuid references suppliers (id) on delete set null,
  project_id   uuid references projects (id) on delete set null,
  number       text,
  date         date not null default current_date,
  total        numeric(14,2) not null default 0,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid,
  updated_by   uuid,
  deleted_at   timestamptz,
  sync_status  sync_state not null default 'synced',
  local_id     text,
  remote_id    text
);

create table if not exists purchase_items (
  id            uuid primary key default gen_random_uuid(),
  purchase_id   uuid not null references purchases (id) on delete cascade,
  business_id   uuid not null references businesses (id) on delete cascade,
  catalog_item_id uuid references catalog_items (id) on delete set null,
  description   text not null,
  quantity      numeric(14,3) not null default 1,
  unit          text default 'unité',
  unit_price    numeric(14,2) not null default 0,
  line_total    numeric(14,2) not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

-- =============================================================================
-- 11. NUMÉROTATION HUMAINE (#105)
--     DEV-2026-0001 (avec année) ou DEV-0001 (numérotation simple, au choix).
--     Le compteur est incrémenté côté base pour éviter les doublons.
-- =============================================================================
create table if not exists document_counters (
  business_id uuid not null references businesses (id) on delete cascade,
  kind        text not null,                 -- DEV | FAC | CH | DEP
  year        int not null default extract(year from current_date),
  last_value  int not null default 0,
  primary key (business_id, kind, year)
);

-- =============================================================================
-- 12. FILE DE SYNCHRONISATION (offline-first)
--     Chaque écriture hors connexion est rejouée dans l'ordre à la reconnexion.
-- =============================================================================
create table if not exists sync_queue (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references businesses (id) on delete cascade,
  profile_id   uuid references profiles (id) on delete set null,
  table_name   text not null,
  record_id    uuid,
  local_id     text,
  operation    text not null check (operation in ('insert', 'update', 'delete')),
  payload      jsonb not null default '{}'::jsonb,
  attempts     int not null default 0,
  last_error   text,
  created_at   timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists sync_queue_pending_idx on sync_queue (business_id, created_at) where processed_at is null;

-- =============================================================================
-- 13. TRIGGERS : dates de modification, auteur, horodatage de synchronisation
-- =============================================================================
create or replace function public.touch_row()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if (to_jsonb(new) ? 'updated_by') and auth.uid() is not null then
    new.updated_by := auth.uid();
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'professions', 'businesses', 'profiles', 'settings', 'clients', 'catalog_items', 'projects',
    'quotes', 'quote_items', 'invoices', 'invoice_items', 'payments', 'expenses',
    'documents', 'photos', 'notifications', 'assistant_messages', 'suppliers', 'purchases', 'purchase_items'
  ] loop
    execute format('drop trigger if exists trg_touch_%1$s on %1$s', t);
    execute format('create trigger trg_touch_%1$s before update on %1$s for each row execute function public.touch_row()', t);
  end loop;
end $$;

-- =============================================================================
-- 14. VUES UTILES (données actives uniquement — suppression logique masquée)
-- =============================================================================
create or replace view v_active_clients   with (security_invoker = true) as select * from clients   where deleted_at is null;
create or replace view v_active_projects  with (security_invoker = true) as select * from projects  where deleted_at is null;
create or replace view v_active_quotes    with (security_invoker = true) as select * from quotes    where deleted_at is null;
create or replace view v_active_invoices  with (security_invoker = true) as select * from invoices  where deleted_at is null;
create or replace view v_active_expenses  with (security_invoker = true) as select * from expenses  where deleted_at is null;

-- Rentabilité par chantier (#114, #204) : budget prévu / dépenses réelles / écart
create or replace view v_project_profitability with (security_invoker = true) as
select
  p.id                as project_id,
  p.business_id,
  p.name,
  p.quote_total,
  coalesce(sum(e.amount) filter (where e.deleted_at is null), 0)                       as spent_total,
  p.quote_total - coalesce(sum(e.amount) filter (where e.deleted_at is null), 0)       as provisional_result,
  p.quote_total - coalesce((
    select sum((value)::numeric) from jsonb_each_text(p.budget)
  ), 0)                                                                               as estimated_margin
from projects p
left join expenses e on e.project_id = p.id and e.deleted_at is null
where p.deleted_at is null
group by p.id;
