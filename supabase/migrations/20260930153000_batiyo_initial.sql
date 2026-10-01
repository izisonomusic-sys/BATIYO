-- BATIYO — migration initiale complète (schéma + RLS + fonctions + référentiel)
-- Générée le 2026-09-30 à partir des scripts canoniques supabase/.
-- Aucun compte, client, devis, facture ou chantier de démonstration n’est inséré.

-- ============================================================================
-- SOURCE: 01-schema.sql
-- ============================================================================

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

-- ============================================================================
-- SOURCE: 02-rls.sql
-- ============================================================================

-- =============================================================================
-- BATIYO — SÉCURITÉ AU NIVEAU DES LIGNES (RLS)
-- -----------------------------------------------------------------------------
-- Règle unique : une entreprise ne voit et ne modifie que ses propres données.
-- Le rattachement se fait par `profiles.business_id` (un profil par utilisateur),
-- ce qui évite toute donnée globale côté client (#88, #226, #243).
-- À exécuter après 01-schema.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Fonctions d'aide (SECURITY DEFINER : évitent la récursion dans les politiques)
-- -----------------------------------------------------------------------------
create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from profiles where id = auth.uid() and deleted_at is null
$$;

create or replace function public.current_profession_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select profession_id from profiles where id = auth.uid() and deleted_at is null
$$;

create or replace function public.is_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and business_id = p_business_id and deleted_at is null
  )
$$;

revoke all on function public.current_business_id() from public;
revoke all on function public.current_profession_id() from public;
revoke all on function public.is_member(uuid) from public;
grant execute on function public.current_business_id() to authenticated;
grant execute on function public.current_profession_id() to authenticated;
grant execute on function public.is_member(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 1. Référentiel : lecture pour tout utilisateur connecté, écriture réservée
--    aux administrateurs (aucune politique d'écriture n'est créée).
-- -----------------------------------------------------------------------------
alter table professions        enable row level security;
alter table catalog_categories enable row level security;
alter table expense_categories enable row level security;
alter table units              enable row level security;

drop policy if exists ref_read on professions;
create policy ref_read on professions for select to authenticated using (true);
drop policy if exists ref_read on catalog_categories;
create policy ref_read on catalog_categories for select to authenticated using (true);
drop policy if exists ref_read on expense_categories;
create policy ref_read on expense_categories for select to authenticated using (true);
drop policy if exists ref_read on units;
create policy ref_read on units for select to authenticated using (true);

-- Le catalogue de référence (business_id NULL) est visible par tous ;
-- les articles personnels ne sont visibles que par leur entreprise.
alter table catalog_items enable row level security;
drop policy if exists catalog_read on catalog_items;
create policy catalog_read on catalog_items for select to authenticated
  using (business_id is null or business_id = public.current_business_id());
drop policy if exists catalog_insert on catalog_items;
create policy catalog_insert on catalog_items for insert to authenticated
  with check (business_id = public.current_business_id());
drop policy if exists catalog_update on catalog_items;
create policy catalog_update on catalog_items for update to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());
drop policy if exists catalog_delete on catalog_items;
create policy catalog_delete on catalog_items for delete to authenticated
  using (business_id = public.current_business_id());

-- -----------------------------------------------------------------------------
-- 2. Entreprises et profils
-- -----------------------------------------------------------------------------
alter table businesses enable row level security;
drop policy if exists businesses_read on businesses;
create policy businesses_read on businesses for select to authenticated
  using (id = public.current_business_id());
drop policy if exists businesses_write on businesses;
create policy businesses_write on businesses for update to authenticated
  using (id = public.current_business_id())
  with check (id = public.current_business_id());

alter table profiles enable row level security;
drop policy if exists profiles_read on profiles;
create policy profiles_read on profiles for select to authenticated
  using (id = auth.uid() or business_id = public.current_business_id());
drop policy if exists profiles_insert on profiles;
drop policy if exists profiles_update on profiles;
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and business_id = public.current_business_id());

alter table settings enable row level security;
drop policy if exists settings_all on settings;
create policy settings_all on settings for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- -----------------------------------------------------------------------------
-- 3. Tables métier : même politique pour toutes les tables portant business_id
-- -----------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'clients', 'projects', 'quotes', 'quote_items', 'invoices', 'invoice_items',
    'payments', 'expenses', 'documents', 'photos', 'notifications',
    'assistant_messages', 'suppliers', 'purchases', 'purchase_items', 'sync_queue'
  ] loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists %I on %I', t || '_read', t);
    execute format(
      'create policy %I on %I for select to authenticated using (business_id = public.current_business_id())',
      t || '_read', t);

    execute format('drop policy if exists %I on %I', t || '_insert', t);
    execute format(
      'create policy %I on %I for insert to authenticated with check (business_id = public.current_business_id())',
      t || '_insert', t);

    execute format('drop policy if exists %I on %I', t || '_update', t);
    execute format(
      'create policy %I on %I for update to authenticated using (business_id = public.current_business_id()) with check (business_id = public.current_business_id())',
      t || '_update', t);

    execute format('drop policy if exists %I on %I', t || '_delete', t);
    execute format(
      'create policy %I on %I for delete to authenticated using (business_id = public.current_business_id())',
      t || '_delete', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Compteurs de numérotation (lecture seule côté client : l'attribution du
--    numéro passe par la fonction next_document_number — voir 03-functions.sql)
-- -----------------------------------------------------------------------------
alter table document_counters enable row level security;
drop policy if exists counters_read on document_counters;
create policy counters_read on document_counters for select to authenticated
  using (business_id = public.current_business_id());

-- ============================================================================
-- SOURCE: 03-functions.sql
-- ============================================================================

-- =============================================================================
-- BATIYO — FONCTIONS ET DÉCLENCHEURS
-- -----------------------------------------------------------------------------
-- • création automatique de l'entreprise + profil + paramètres à l'inscription ;
-- • attribution atomique des numéros humains (DEV-2026-0001, FAC-2026-0001…) ;
-- • recalcul du montant payé et du statut d'une facture ;
-- • espaces de stockage (logos, photos de chantier, reçus) avec leurs règles ;
--   aucune donnée réelle n'est utilisée par l'assistant sans confirmation (#116).
-- À exécuter après 02-rls.sql.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Inscription : crée l'entreprise, le profil et les paramètres par défaut
--    Le métier choisi à l'inscription est stocké dans les métadonnées (#15, #259).
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_name        text;
  v_profession  text;
  v_phone       text;
begin
  v_name       := coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1));
  v_profession := new.raw_user_meta_data ->> 'profession_id';
  v_phone      := new.raw_user_meta_data ->> 'phone';

  insert into businesses (name, manager_name, phone, email, created_by)
  values (
    coalesce(nullif(new.raw_user_meta_data ->> 'business_name', ''), 'Mon entreprise'),
    v_name, v_phone, new.email, new.id
  )
  returning id into v_business_id;

  insert into profiles (id, business_id, profession_id, full_name, phone, email, address, role, created_by)
  values (
    new.id, v_business_id, v_profession, v_name,
    v_phone, new.email, new.raw_user_meta_data ->> 'address',
    'proprietaire', new.id
  );

  insert into settings (business_id, created_by) values (v_business_id, new.id);

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 2. Numérotation humaine (#105) : DEV-2026-0001 / FAC-2026-0001 / CH / DEP
--    Le style est configurable : « year » (défaut) ou « plain » (DEV-0001).
--    L'incrément est protégé par un verrou par entreprise + type.
-- -----------------------------------------------------------------------------
create or replace function public.next_document_number(
  p_kind text,
  p_business_id uuid default public.current_business_id()
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_year  int := extract(year from current_date)::int;
  v_value int;
  v_style text;
  v_prefix text;
begin
  if p_business_id is null then
    raise exception 'Aucune entreprise associée à cet utilisateur.';
  end if;
  if not public.is_member(p_business_id) then
    raise exception 'Accès refusé pour cette entreprise.';
  end if;

  select coalesce(numbering_style, 'year'),
         case p_kind
           when 'DEV' then coalesce(quote_prefix, 'DEV')
           when 'FAC' then coalesce(invoice_prefix, 'FAC')
           when 'CH'  then coalesce(project_prefix, 'CH')
           when 'DEP' then coalesce(expense_prefix, 'DEP')
           else p_kind
         end
    into v_style, v_prefix
    from settings where business_id = p_business_id;

  if v_prefix is null then v_prefix := p_kind; end if;

  insert into document_counters (business_id, kind, year, last_value)
  values (p_business_id, p_kind, v_year, 1)
  on conflict (business_id, kind, year)
  do update set last_value = document_counters.last_value + 1
  returning last_value into v_value;

  if v_style = 'plain' then
    return v_prefix || '-' || lpad(v_value::text, 4, '0');
  end if;
  return v_prefix || '-' || v_year || '-' || lpad(v_value::text, 4, '0');
end $$;

grant execute on function public.next_document_number(text, uuid) to authenticated;

-- Ajoute le numéro si l'appelant n'en a pas fourni
create or replace function public.set_document_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_kind text;
begin
  if new.number is not null and new.number <> '' then return new; end if;
  v_kind := case tg_table_name
              when 'quotes'   then 'DEV'
              when 'invoices' then 'FAC'
              when 'projects' then 'CH'
              when 'expenses' then 'DEP'
            end;
  if v_kind is not null then
    new.number := public.next_document_number(v_kind, new.business_id);
  end if;
  return new;
end $$;

drop trigger if exists trg_number_quotes on quotes;
create trigger trg_number_quotes before insert on quotes
  for each row execute function public.set_document_number();
drop trigger if exists trg_number_invoices on invoices;
create trigger trg_number_invoices before insert on invoices
  for each row execute function public.set_document_number();
drop trigger if exists trg_number_projects on projects;
create trigger trg_number_projects before insert on projects
  for each row execute function public.set_document_number();
drop trigger if exists trg_number_expenses on expenses;
create trigger trg_number_expenses before insert on expenses
  for each row execute function public.set_document_number();

-- -----------------------------------------------------------------------------
-- 3. Factures : montant payé et statut recalculés automatiquement
--    Paiement manuel uniquement — aucun encaissement automatique (#273).
-- -----------------------------------------------------------------------------
create or replace function public.refresh_invoice_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice uuid;
  v_paid numeric(14,2);
  v_total numeric(14,2);
  v_due date;
begin
  -- NEW est NULL sur DELETE : on lit la bonne pseudo-ligne
  if tg_op = 'DELETE' then v_invoice := old.invoice_id; else v_invoice := new.invoice_id; end if;

  select coalesce(sum(amount), 0) into v_paid
    from payments where invoice_id = v_invoice and deleted_at is null;

  select total, due_date into v_total, v_due from invoices where id = v_invoice;
  if v_total is null then return null; end if;

  update invoices
     set paid_amount = v_paid,
         status = case
           when status in ('brouillon', 'annulee') then status
           when v_paid <= 0 then (case when v_due is not null and v_due < current_date then 'en_retard' else 'envoyee' end)
           when v_paid < v_total then 'partielle'
           else 'payee'
         end
   where id = v_invoice;

  return null;
end $$;

drop trigger if exists trg_invoice_payment on payments;
create trigger trg_invoice_payment
  after insert or update or delete on payments
  for each row execute function public.refresh_invoice_payment();

-- -----------------------------------------------------------------------------
-- 4. Total d'une ligne, garde-fou côté base (le calcul applicatif reste la
--    référence ; la base empêche les incohérences) (#103)
-- -----------------------------------------------------------------------------
create or replace function public.compute_line_total()
returns trigger
language plpgsql
as $$
begin
  new.line_total := round(greatest(new.quantity, 0) * greatest(new.unit_price, 0), 2);
  return new;
end $$;

drop trigger if exists trg_line_total_quote on quote_items;
create trigger trg_line_total_quote before insert or update on quote_items
  for each row execute function public.compute_line_total();
drop trigger if exists trg_line_total_invoice on invoice_items;
create trigger trg_line_total_invoice before insert or update on invoice_items
  for each row execute function public.compute_line_total();

-- -----------------------------------------------------------------------------
-- 5. Marge prévisionnelle et résultat provisoire par chantier (#114, #204)
--    Formulation prudente : ce sont des estimations issues des données saisies.
-- -----------------------------------------------------------------------------
create or replace function public.project_summary(p_project_id uuid)
returns table (
  contract_total      numeric,
  budget_total        numeric,
  spent_total         numeric,
  budget_remaining    numeric,
  estimated_margin    numeric,
  provisional_result  numeric
)
language sql
stable
security invoker
as $$
  select
    p.quote_total,
    coalesce((select sum((value)::numeric) from jsonb_each_text(p.budget)), 0),
    coalesce((select sum(amount) from expenses e where e.project_id = p.id and e.deleted_at is null), 0),
    coalesce((select sum((value)::numeric) from jsonb_each_text(p.budget)), 0)
      - coalesce((select sum(amount) from expenses e where e.project_id = p.id and e.deleted_at is null), 0),
    p.quote_total - coalesce((select sum((value)::numeric) from jsonb_each_text(p.budget)), 0),
    p.quote_total - coalesce((select sum(amount) from expenses e where e.project_id = p.id and e.deleted_at is null), 0)
  from projects p
  where p.id = p_project_id and p.deleted_at is null
$$;

-- Les fonctions SECURITY DEFINER ne constituent pas une API publique.
revoke all on function public.handle_new_user() from public;
revoke all on function public.next_document_number(text, uuid) from public;
revoke all on function public.set_document_number() from public;
revoke all on function public.refresh_invoice_payment() from public;
grant execute on function public.next_document_number(text, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Stockage : logos, photos de chantier et reçus (#70, #71, #196)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true), ('photos', 'photos', false), ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Chemin attendu : <business_id>/<fichier>
drop policy if exists batiyo_storage_read on storage.objects;
create policy batiyo_storage_read on storage.objects for select to authenticated
  using (
    bucket_id in ('logos', 'photos', 'receipts')
    and (bucket_id = 'logos' or (storage.foldername(name))[1] = public.current_business_id()::text)
  );

drop policy if exists batiyo_storage_write on storage.objects;
create policy batiyo_storage_write on storage.objects for insert to authenticated
  with check (
    bucket_id in ('logos', 'photos', 'receipts')
    and (storage.foldername(name))[1] = public.current_business_id()::text
  );

drop policy if exists batiyo_storage_update on storage.objects;
create policy batiyo_storage_update on storage.objects for update to authenticated
  using ((storage.foldername(name))[1] = public.current_business_id()::text);

drop policy if exists batiyo_storage_delete on storage.objects;
create policy batiyo_storage_delete on storage.objects for delete to authenticated
  using ((storage.foldername(name))[1] = public.current_business_id()::text);

-- -----------------------------------------------------------------------------
-- 7. Statistiques du tableau de bord (#20) — une seule requête côté client
-- -----------------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns table (
  revenue           numeric,
  expenses_total    numeric,
  estimated_margin  numeric,
  provisional_result numeric,
  active_projects   int,
  unpaid_total      numeric
)
language sql
stable
security invoker
as $$
  with b as (select public.current_business_id() as id),
  accepted_quotes as (
    select coalesce(sum(q.total), 0) as v from quotes q, b
     where q.business_id = b.id and q.deleted_at is null and q.status in ('accepte', 'converti')
  ),
  direct_invoices as (
    select coalesce(sum(i.total), 0) as v from invoices i, b
     where i.business_id = b.id and i.deleted_at is null
       and i.quote_id is null and i.status not in ('brouillon', 'annulee')
  ),
  spent as (
    select coalesce(sum(e.amount), 0) as v from expenses e, b
     where e.business_id = b.id and e.deleted_at is null
  ),
  budget as (
    select coalesce(sum((value)::numeric), 0) as v
      from projects p, b, jsonb_each_text(p.budget)
     where p.business_id = b.id and p.deleted_at is null and p.status <> 'termine'
  ),
  actives as (
    select count(*)::int as v from projects p, b
     where p.business_id = b.id and p.deleted_at is null
       and coalesce(p.archived, false) = false and p.status in ('planifie', 'en_cours')
  ),
  unpaid as (
    select coalesce(sum(i.total - i.paid_amount), 0) as v from invoices i, b
     where i.business_id = b.id and i.deleted_at is null and i.status not in ('brouillon', 'annulee', 'payee')
  )
  select
    (select v from accepted_quotes) + (select v from direct_invoices),
    (select v from spent),
    (select v from accepted_quotes) + (select v from direct_invoices) - (select v from budget),
    (select v from accepted_quotes) + (select v from direct_invoices) - (select v from spent),
    (select v from actives),
    (select v from unpaid)
$$;

grant execute on function public.dashboard_stats() to authenticated;
grant execute on function public.project_summary(uuid) to authenticated;

-- ============================================================================
-- SOURCE: 04-reference.sql
-- ============================================================================

-- =============================================================================
-- BATIYO — RÉFÉRENTIEL DE BASE (métiers, unités, catégories, catalogues modèles)
-- -----------------------------------------------------------------------------
-- Fichier GÉNÉRÉ automatiquement — ne pas modifier à la main.
-- Source : src/01-config.js et src/02-professions.js
-- Régénérer avec : node tools/gen-supabase-reference.js
-- À exécuter après 03-functions.sql. Rejouable sans risque (upsert).
-- =============================================================================

-- 1. Unités de mesure
insert into units (code, label, position) values ('sac', 'sac', 0)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('barre', 'barre', 1)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('kg', 'kg', 2)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('tonne', 'tonne', 3)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('m', 'mètre', 4)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('m2', 'm²', 5)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('m3', 'm³', 6)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('litre', 'litre', 7)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('voyage', 'voyage', 8)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('heure', 'heure', 9)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('jour', 'jour', 10)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('forfait', 'forfait', 11)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('unite', 'unité', 12)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('carton', 'carton', 13)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('rouleau', 'rouleau', 14)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into units (code, label, position) values ('piece', 'pièce', 15)
  on conflict (code) do update set label = excluded.label, position = excluded.position;

-- 2. Catégories de dépenses
insert into expense_categories (code, label, position) values ('materiaux', 'Matériaux', 0)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('main_oeuvre', 'Main-d’œuvre', 1)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('transport', 'Transport', 2)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('carburant', 'Carburant', 3)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('outillage', 'Outillage', 4)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('fournitures', 'Fournitures', 5)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into expense_categories (code, label, position) values ('autres', 'Autres', 6)
  on conflict (code) do update set label = excluded.label, position = excluded.position;

-- 3. Catégories du catalogue
insert into catalog_categories (code, label, position) values ('materiaux', 'Matériaux', 0)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('services', 'Services', 1)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('sanitaire', 'Sanitaire', 2)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('electrique', 'Électrique', 3)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('finition', 'Finition', 4)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('outillage', 'Outillage', 5)
  on conflict (code) do update set label = excluded.label, position = excluded.position;
insert into catalog_categories (code, label, position) values ('divers', 'Divers', 6)
  on conflict (code) do update set label = excluded.label, position = excluded.position;

-- 4. Métiers et catalogues modèles (business_id NULL = article partagé)
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'maçon', 'Maçon', 'brick', '[]'::jsonb,
  '[{"id":null,"name":"Ciment CPJ 45","unit":"sac","default_price":5500,"category":"materiaux","favorite":true,"keywords":"ciment cpj sac liant","active":true},{"id":null,"name":"Ciment CPA 45","unit":"sac","default_price":6200,"category":"materiaux","favorite":false,"keywords":"ciment cpa sac","active":true},{"id":null,"name":"Sable","unit":"voyage","default_price":35000,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Sable fin","unit":"m3","default_price":9000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Gravier 15/25","unit":"voyage","default_price":48000,"category":"materiaux","favorite":true,"keywords":"gravier cailloux beton","active":true},{"id":null,"name":"Gravier 5/15","unit":"voyage","default_price":45000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Fer 6","unit":"barre","default_price":2500,"category":"materiaux","favorite":true,"keywords":"fer a beton rond","active":true},{"id":null,"name":"Fer 8","unit":"barre","default_price":4500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 10","unit":"barre","default_price":6500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 12","unit":"barre","default_price":9500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Fer 14","unit":"barre","default_price":12500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Fer 16","unit":"barre","default_price":16500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Agglo 10","unit":"unité","default_price":275,"category":"materiaux","favorite":false,"keywords":"agglo bloc parpaing","active":true},{"id":null,"name":"Agglo 15","unit":"unité","default_price":350,"category":"materiaux","favorite":true,"keywords":"agglo bloc parpaing","active":true},{"id":null,"name":"Agglo 20","unit":"unité","default_price":425,"category":"materiaux","favorite":false,"keywords":"agglo bloc parpaing","active":true},{"id":null,"name":"Brique rouge","unit":"unité","default_price":200,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Coffrage","unit":"forfait","default_price":35000,"category":"services","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre maçonnerie","unit":"forfait","default_price":150000,"category":"services","favorite":true,"keywords":"main oeuvre macon","active":true},{"id":null,"name":"Transport","unit":"voyage","default_price":15000,"category":"services","favorite":true,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"mur","name":"Devis construction mur","hint":"Agglos, ciment, fer, sable, main-d’œuvre","items":[{"name":"Agglo 15","qty":800,"unit":"unité"},{"name":"Ciment CPJ 45","qty":25,"unit":"sac"},{"name":"Sable","qty":3,"unit":"voyage"},{"name":"Fer 8","qty":20,"unit":"barre"},{"name":"Main-d’œuvre maçonnerie","qty":1,"unit":"forfait"}],"budget":{"ciment":140000,"fer":90000,"sable":105000,"gravier":0,"main_oeuvre":250000,"transport":40000,"autres":30000}},{"id":"dalle","name":"Devis dalle béton","hint":"Béton, ferraillage, coffrage","items":[{"name":"Ciment CPJ 45","qty":60,"unit":"sac"},{"name":"Sable","qty":6,"unit":"voyage"},{"name":"Gravier 15/25","qty":8,"unit":"voyage"},{"name":"Fer 10","qty":60,"unit":"barre"},{"name":"Coffrage","qty":1,"unit":"forfait"},{"name":"Main-d’œuvre maçonnerie","qty":1,"unit":"forfait"}],"budget":{"ciment":335000,"fer":330000,"sable":210000,"gravier":220000,"main_oeuvre":450000,"transport":90000,"autres":60000}}]'::jsonb::jsonb,
  '{"ciment":24,"fer":17,"sable":9,"gravier":8,"main_oeuvre":31,"transport":6,"autres":5}'::jsonb::jsonb,
  true, 1)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'plombier', 'Plombier', 'drop', '[]'::jsonb,
  '[{"id":null,"name":"PVC 20","unit":"barre","default_price":2200,"category":"sanitaire","favorite":false,"keywords":"tube pvc tuyau","active":true},{"id":null,"name":"PVC 25","unit":"barre","default_price":3000,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"PVC 32","unit":"barre","default_price":4200,"category":"sanitaire","favorite":true,"keywords":"","active":true},{"id":null,"name":"PVC 40","unit":"barre","default_price":6000,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Coude","unit":"unité","default_price":550,"category":"sanitaire","favorite":true,"keywords":"","active":true},{"id":null,"name":"Té","unit":"unité","default_price":750,"category":"sanitaire","favorite":true,"keywords":"","active":true},{"id":null,"name":"Vanne","unit":"unité","default_price":3500,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Robinet","unit":"unité","default_price":8500,"category":"sanitaire","favorite":true,"keywords":"","active":true},{"id":null,"name":"Flexible","unit":"unité","default_price":1500,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Joint","unit":"unité","default_price":250,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Colle PVC","unit":"unité","default_price":3200,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"PPR 20","unit":"barre","default_price":3800,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"PPR 25","unit":"barre","default_price":5200,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Chauffe-eau","unit":"unité","default_price":95000,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"WC complet","unit":"unité","default_price":85000,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Lavabo","unit":"unité","default_price":45000,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre plomberie","unit":"forfait","default_price":85000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Pose","unit":"unité","default_price":12000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Déplacement","unit":"forfait","default_price":5000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"sdb","name":"Devis installation sanitaire","hint":"Tuyaux, raccords, pose","items":[{"name":"PVC 32","qty":30,"unit":"barre"},{"name":"Coude","qty":25,"unit":"unité"},{"name":"Té","qty":15,"unit":"unité"},{"name":"Colle PVC","qty":4,"unit":"unité"},{"name":"Robinet","qty":4,"unit":"unité"},{"name":"Main-d’œuvre plomberie","qty":1,"unit":"forfait"}],"budget":{"ciment":25000,"main_oeuvre":260000,"transport":40000,"autres":60000,"fer":0,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":5,"fer":3,"sable":4,"gravier":3,"main_oeuvre":62,"transport":11,"autres":12}'::jsonb::jsonb,
  true, 2)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'electricien', 'Électricien', 'bolt', '[]'::jsonb,
  '[{"id":null,"name":"Câble 1,5","unit":"rouleau","default_price":12500,"category":"electrique","favorite":true,"keywords":"cable fil souple","active":true},{"id":null,"name":"Câble 2,5","unit":"rouleau","default_price":18500,"category":"electrique","favorite":true,"keywords":"","active":true},{"id":null,"name":"Câble 4","unit":"rouleau","default_price":26000,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Câble 6","unit":"rouleau","default_price":38000,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Disjoncteur","unit":"unité","default_price":6500,"category":"electrique","favorite":true,"keywords":"","active":true},{"id":null,"name":"Prise","unit":"unité","default_price":1800,"category":"electrique","favorite":true,"keywords":"","active":true},{"id":null,"name":"Interrupteur","unit":"unité","default_price":1500,"category":"electrique","favorite":true,"keywords":"","active":true},{"id":null,"name":"Gaine","unit":"barre","default_price":750,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Boîte d’encastrement","unit":"unité","default_price":350,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Tableau électrique","unit":"unité","default_price":45000,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Ampoule LED","unit":"unité","default_price":1500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Réglette LED","unit":"unité","default_price":9500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Douille","unit":"unité","default_price":800,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Domino","unit":"unité","default_price":150,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre électricité","unit":"forfait","default_price":75000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Installation","unit":"unité","default_price":5000,"category":"services","favorite":false,"keywords":"","active":true},{"id":null,"name":"Dépannage","unit":"forfait","default_price":15000,"category":"services","favorite":true,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"tableau","name":"Devis installation électrique","hint":"Câbles, appareillage, tableau","items":[{"name":"Câble 1,5","qty":5,"unit":"rouleau"},{"name":"Câble 2,5","qty":4,"unit":"rouleau"},{"name":"Gaine","qty":40,"unit":"barre"},{"name":"Tableau électrique","qty":1,"unit":"unité"},{"name":"Disjoncteur","qty":8,"unit":"unité"},{"name":"Prise","qty":12,"unit":"unité"},{"name":"Interrupteur","qty":8,"unit":"unité"},{"name":"Main-d’œuvre électricité","qty":1,"unit":"forfait"}],"budget":{"ciment":20000,"fer":30000,"main_oeuvre":280000,"transport":50000,"autres":90000,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":5,"fer":6,"sable":3,"gravier":3,"main_oeuvre":58,"transport":11,"autres":14}'::jsonb::jsonb,
  true, 3)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'peintre', 'Peintre', 'brush', '[]'::jsonb,
  '[{"id":null,"name":"Peinture acrylique","unit":"unité","default_price":18500,"category":"finition","favorite":true,"keywords":"peinture pot seau","active":true},{"id":null,"name":"Peinture à l’huile","unit":"unité","default_price":22000,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Sous-couche","unit":"unité","default_price":14500,"category":"finition","favorite":true,"keywords":"","active":true},{"id":null,"name":"Enduit de lissage","unit":"sac","default_price":6500,"category":"finition","favorite":true,"keywords":"","active":true},{"id":null,"name":"Mastic","unit":"kg","default_price":1800,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Rouleau","unit":"unité","default_price":2500,"category":"outillage","favorite":true,"keywords":"","active":true},{"id":null,"name":"Pinceau","unit":"unité","default_price":1200,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Brosse","unit":"unité","default_price":1000,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Papier abrasif","unit":"unité","default_price":500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Bâche de protection","unit":"unité","default_price":3500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Diluant","unit":"litre","default_price":2200,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Préparation des supports","unit":"m2","default_price":1200,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Finition","unit":"m2","default_price":1500,"category":"services","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre peinture","unit":"forfait","default_price":45000,"category":"services","favorite":true,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"appart","name":"Devis peinture appartement","hint":"Peinture, enduit, préparation","items":[{"name":"Peinture acrylique","qty":12,"unit":"unité"},{"name":"Sous-couche","qty":6,"unit":"unité"},{"name":"Enduit de lissage","qty":15,"unit":"sac"},{"name":"Papier abrasif","qty":20,"unit":"unité"},{"name":"Préparation des supports","qty":1,"unit":"forfait"},{"name":"Main-d’œuvre peinture","qty":1,"unit":"forfait"}],"budget":{"ciment":30000,"main_oeuvre":220000,"transport":35000,"autres":90000,"fer":0,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":6,"fer":2,"sable":3,"gravier":2,"main_oeuvre":55,"transport":10,"autres":22}'::jsonb::jsonb,
  true, 4)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'menuisier', 'Menuisier', 'hammer', '[]'::jsonb,
  '[{"id":null,"name":"Planche","unit":"unité","default_price":6500,"category":"materiaux","favorite":true,"keywords":"planche bois","active":true},{"id":null,"name":"Bois chevron","unit":"unité","default_price":4500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Contreplaqué","unit":"unité","default_price":18500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"MDF","unit":"unité","default_price":22000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Porte bois","unit":"unité","default_price":45000,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Cadre de porte","unit":"unité","default_price":25000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Charnière","unit":"unité","default_price":1200,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Serrure","unit":"unité","default_price":12500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Poignée","unit":"unité","default_price":3500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Vis à bois","unit":"kg","default_price":2200,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Colle à bois","unit":"unité","default_price":2800,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Vernis","unit":"litre","default_price":4500,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre menuiserie","unit":"forfait","default_price":95000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Pose","unit":"unité","default_price":15000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"bois","name":"Devis menuiserie bois","hint":"Bois, quincaillerie, pose","items":[{"name":"Planche","qty":30,"unit":"unité"},{"name":"Bois chevron","qty":40,"unit":"unité"},{"name":"Contreplaqué","qty":8,"unit":"unité"},{"name":"Charnière","qty":12,"unit":"unité"},{"name":"Main-d’œuvre menuiserie","qty":1,"unit":"forfait"}],"budget":{"ciment":20000,"fer":40000,"main_oeuvre":260000,"transport":60000,"autres":80000,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":5,"fer":8,"sable":4,"gravier":3,"main_oeuvre":52,"transport":13,"autres":15}'::jsonb::jsonb,
  true, 5)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'carreleur', 'Carreleur', 'grid', '[]'::jsonb,
  '[{"id":null,"name":"Carrelage 40x40","unit":"m2","default_price":6500,"category":"materiaux","favorite":true,"keywords":"carrelage carreau sol","active":true},{"id":null,"name":"Carrelage 60x60","unit":"m2","default_price":9500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Faïence murale","unit":"m2","default_price":7800,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Colle à carrelage","unit":"sac","default_price":4800,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Joint de carrelage","unit":"sac","default_price":3500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Croisillons","unit":"unité","default_price":1500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Plinthe","unit":"m","default_price":1800,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Ciment CPJ 45","unit":"sac","default_price":5500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Sable","unit":"voyage","default_price":35000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Meuleuse","unit":"unité","default_price":35000,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre carrelage","unit":"forfait","default_price":65000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Pose carrelage","unit":"m2","default_price":2500,"category":"services","favorite":true,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"sol","name":"Devis pose carrelage","hint":"Carrelage, colle, joint","items":[{"name":"Carrelage 40x40","qty":90,"unit":"m2"},{"name":"Colle à carrelage","qty":25,"unit":"sac"},{"name":"Joint de carrelage","qty":12,"unit":"sac"},{"name":"Croisillons","qty":10,"unit":"unité"},{"name":"Main-d’œuvre carrelage","qty":1,"unit":"forfait"}],"budget":{"ciment":100000,"main_oeuvre":180000,"transport":30000,"autres":40000,"fer":0,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":22,"fer":3,"sable":8,"gravier":4,"main_oeuvre":47,"transport":8,"autres":8}'::jsonb::jsonb,
  true, 6)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'soudeur', 'Soudeur', 'flame', '[]'::jsonb,
  '[{"id":null,"name":"Fer 12","unit":"barre","default_price":9500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 16","unit":"barre","default_price":16500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 20","unit":"barre","default_price":25000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Fer cornière","unit":"barre","default_price":12500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Tôle","unit":"unité","default_price":22000,"category":"materiaux","favorite":true,"keywords":"tole bac","active":true},{"id":null,"name":"Tube carré","unit":"barre","default_price":8500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Électrode","unit":"kg","default_price":3500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Gaz soudure","unit":"unité","default_price":18000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Disque à tronçonner","unit":"unité","default_price":2500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Peinture antirouille","unit":"unité","default_price":9500,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre soudure","unit":"forfait","default_price":65000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Soudure sur site","unit":"heure","default_price":5000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"portail","name":"Devis portail métallique","hint":"Fer, peinture, soudure","items":[{"name":"Fer 12","qty":35,"unit":"barre"},{"name":"Fer 16","qty":12,"unit":"barre"},{"name":"Fer cornière","qty":10,"unit":"barre"},{"name":"Électrode","qty":8,"unit":"kg"},{"name":"Peinture antirouille","qty":6,"unit":"unité"},{"name":"Main-d’œuvre soudure","qty":1,"unit":"forfait"}],"budget":{"ciment":25000,"fer":320000,"main_oeuvre":150000,"transport":40000,"autres":50000,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":6,"fer":40,"sable":3,"gravier":3,"main_oeuvre":33,"transport":8,"autres":7}'::jsonb::jsonb,
  true, 7)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'climaticien', 'Climaticien', 'wind', '[]'::jsonb,
  '[{"id":null,"name":"Climatiseur 1 CV","unit":"unité","default_price":185000,"category":"materiaux","favorite":true,"keywords":"clim split climatiseur","active":true},{"id":null,"name":"Climatiseur 1,5 CV","unit":"unité","default_price":235000,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Climatiseur 2 CV","unit":"unité","default_price":320000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Support climatiseur","unit":"unité","default_price":12000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Tuyau cuivre","unit":"m","default_price":6500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Gaz R410","unit":"kg","default_price":15000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Câble 2,5","unit":"rouleau","default_price":18500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Disjoncteur","unit":"unité","default_price":6500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Télécommande","unit":"unité","default_price":8500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre climatisation","unit":"forfait","default_price":45000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Entretien climatiseur","unit":"unité","default_price":15000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Recharge gaz","unit":"unité","default_price":25000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"split","name":"Devis installation climatiseur","hint":"Split, supports, mise en service","items":[{"name":"Climatiseur 1 CV","qty":2,"unit":"unité"},{"name":"Support climatiseur","qty":2,"unit":"unité"},{"name":"Tuyau cuivre","qty":12,"unit":"m"},{"name":"Câble 2,5","qty":1,"unit":"rouleau"},{"name":"Main-d’œuvre climatisation","qty":1,"unit":"forfait"}],"budget":{"ciment":20000,"main_oeuvre":180000,"transport":45000,"autres":120000,"fer":0,"sable":0,"gravier":0}}]'::jsonb::jsonb,
  '{"ciment":4,"fer":5,"sable":2,"gravier":2,"main_oeuvre":52,"transport":13,"autres":22}'::jsonb::jsonb,
  true, 8)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'mecanicien', 'Mécanicien', 'wrench', '[]'::jsonb,
  '[{"id":null,"name":"Huile moteur","unit":"litre","default_price":4500,"category":"materiaux","favorite":true,"keywords":"huile vidange","active":true},{"id":null,"name":"Filtre à huile","unit":"unité","default_price":6500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Filtre à air","unit":"unité","default_price":8500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Filtre à gasoil","unit":"unité","default_price":9500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Plaquettes de frein","unit":"unité","default_price":12500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Bougie","unit":"unité","default_price":4500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Batterie","unit":"unité","default_price":55000,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Courroie","unit":"unité","default_price":15000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Pneu","unit":"unité","default_price":45000,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Liquide de frein","unit":"litre","default_price":3500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre mécanique","unit":"forfait","default_price":25000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Diagnostic","unit":"forfait","default_price":10000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Sortie véhicule","unit":"forfait","default_price":15000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"revision","name":"Devis révision véhicule","hint":"Vidange, filtres, freins","items":[{"name":"Huile moteur","qty":5,"unit":"litre"},{"name":"Filtre à huile","qty":1,"unit":"unité"},{"name":"Filtre à air","qty":1,"unit":"unité"},{"name":"Plaquettes de frein","qty":4,"unit":"unité"},{"name":"Main-d’œuvre mécanique","qty":1,"unit":"forfait"}],"budget":{"ciment":0,"fer":10000,"sable":0,"gravier":0,"main_oeuvre":60000,"transport":15000,"autres":40000}}]'::jsonb::jsonb,
  '{"ciment":0,"fer":10,"sable":0,"gravier":0,"main_oeuvre":60,"transport":10,"autres":20}'::jsonb::jsonb,
  true, 9)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'quincaillier', 'Quincaillier', 'store', '[]'::jsonb,
  '[{"id":null,"name":"Ciment CPJ 45","unit":"sac","default_price":5500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 6","unit":"barre","default_price":2500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 8","unit":"barre","default_price":4500,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Fer 10","unit":"barre","default_price":6500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Fer 12","unit":"barre","default_price":9500,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Agglo 15","unit":"unité","default_price":350,"category":"materiaux","favorite":true,"keywords":"","active":true},{"id":null,"name":"Agglo 20","unit":"unité","default_price":425,"category":"materiaux","favorite":false,"keywords":"","active":true},{"id":null,"name":"Tube PVC 32","unit":"barre","default_price":4200,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Robinet","unit":"unité","default_price":8500,"category":"sanitaire","favorite":false,"keywords":"","active":true},{"id":null,"name":"Câble 1,5","unit":"rouleau","default_price":12500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Câble 2,5","unit":"rouleau","default_price":18500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Prise","unit":"unité","default_price":1800,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Interrupteur","unit":"unité","default_price":1500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Ampoule LED","unit":"unité","default_price":1500,"category":"electrique","favorite":false,"keywords":"","active":true},{"id":null,"name":"Peinture acrylique","unit":"unité","default_price":18500,"category":"finition","favorite":false,"keywords":"","active":true},{"id":null,"name":"Marteau","unit":"unité","default_price":5500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Truelle","unit":"unité","default_price":2500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Mètre ruban","unit":"unité","default_price":2200,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Niveau à bulle","unit":"unité","default_price":6500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Pelle","unit":"unité","default_price":4500,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Brouette","unit":"unité","default_price":35000,"category":"outillage","favorite":false,"keywords":"","active":true},{"id":null,"name":"Livraison","unit":"forfait","default_price":15000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"chantier","name":"Facture matériaux de chantier","hint":"Vente de matériaux","items":[{"name":"Ciment CPJ 45","qty":20,"unit":"sac"},{"name":"Fer 8","qty":10,"unit":"barre"},{"name":"Agglo 15","qty":100,"unit":"unité"},{"name":"Livraison","qty":1,"unit":"forfait"}],"budget":{"ciment":110000,"fer":45000,"sable":0,"gravier":0,"main_oeuvre":15000,"transport":20000,"autres":20000}}]'::jsonb::jsonb,
  '{"ciment":30,"fer":20,"sable":5,"gravier":5,"main_oeuvre":10,"transport":10,"autres":20}'::jsonb::jsonb,
  true, 10)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'commercant', 'Commerçant', 'cart', '[]'::jsonb,
  '[{"id":null,"name":"Article divers","unit":"unité","default_price":5000,"category":"divers","favorite":true,"keywords":"","active":true},{"id":null,"name":"Sac de riz 50 kg","unit":"sac","default_price":32000,"category":"divers","favorite":true,"keywords":"","active":true},{"id":null,"name":"Huile 5 L","unit":"unité","default_price":8500,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Carton de savon","unit":"carton","default_price":12000,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Bouteille d’eau","unit":"unité","default_price":300,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Boîte de tomate","unit":"carton","default_price":15000,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Spaghetti (carton)","unit":"carton","default_price":9000,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Sucre 50 kg","unit":"sac","default_price":35000,"category":"divers","favorite":false,"keywords":"","active":true},{"id":null,"name":"Livraison","unit":"forfait","default_price":15000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"vente","name":"Facture de vente","hint":"Produits vendus","items":[{"name":"Article A","qty":10,"unit":"unité"},{"name":"Livraison","qty":1,"unit":"forfait"}],"budget":{"ciment":0,"fer":0,"sable":0,"gravier":0,"main_oeuvre":25000,"transport":25000,"autres":50000}}]'::jsonb::jsonb,
  '{"ciment":0,"fer":0,"sable":0,"gravier":0,"main_oeuvre":20,"transport":25,"autres":55}'::jsonb::jsonb,
  true, 11)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;
insert into professions (code, name, icon, tags, catalog, templates, budget_profile, active, position) values (
  'autre', 'Autre', 'dots', '[]'::jsonb,
  '[{"id":null,"name":"Fourniture","unit":"forfait","default_price":25000,"category":"divers","favorite":true,"keywords":"","active":true},{"id":null,"name":"Main-d’œuvre","unit":"forfait","default_price":100000,"category":"services","favorite":true,"keywords":"","active":true},{"id":null,"name":"Transport","unit":"forfait","default_price":15000,"category":"services","favorite":false,"keywords":"","active":true}]'::jsonb::jsonb,
  '[{"id":"generique","name":"Devis général","hint":"Prestations et fournitures","items":[{"name":"Fourniture","qty":1,"unit":"forfait"},{"name":"Main-d’œuvre","qty":1,"unit":"forfait"}],"budget":{"ciment":0,"fer":0,"sable":0,"gravier":0,"main_oeuvre":100000,"transport":20000,"autres":50000}}]'::jsonb::jsonb,
  '{"ciment":15,"fer":10,"sable":5,"gravier":5,"main_oeuvre":40,"transport":10,"autres":15}'::jsonb::jsonb,
  true, 12)
  on conflict (code) do update set name = excluded.name, icon = excluded.icon, tags = excluded.tags, catalog = excluded.catalog, templates = excluded.templates, budget_profile = excluded.budget_profile, position = excluded.position;

-- 5. Catalogue global par métier (consultable par toutes les entreprises de ce métier)
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Ciment CPJ 45', '', 'sac', 5500, 'materiaux', true, 'ciment cpj sac liant', true, 'ci_macon-0-ciment-cpj-45')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Ciment CPA 45', '', 'sac', 6200, 'materiaux', false, 'ciment cpa sac', true, 'ci_macon-1-ciment-cpa-45')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Sable', '', 'voyage', 35000, 'materiaux', true, '', true, 'ci_macon-2-sable')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Sable fin', '', 'm3', 9000, 'materiaux', false, '', true, 'ci_macon-3-sable-fin')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Gravier 15/25', '', 'voyage', 48000, 'materiaux', true, 'gravier cailloux beton', true, 'ci_macon-4-gravier-15-25')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Gravier 5/15', '', 'voyage', 45000, 'materiaux', false, '', true, 'ci_macon-5-gravier-5-15')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 6', '', 'barre', 2500, 'materiaux', true, 'fer a beton rond', true, 'ci_macon-6-fer-6')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 8', '', 'barre', 4500, 'materiaux', true, '', true, 'ci_macon-7-fer-8')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 10', '', 'barre', 6500, 'materiaux', true, '', true, 'ci_macon-8-fer-10')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 12', '', 'barre', 9500, 'materiaux', false, '', true, 'ci_macon-9-fer-12')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 14', '', 'barre', 12500, 'materiaux', false, '', true, 'ci_macon-10-fer-14')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Fer 16', '', 'barre', 16500, 'materiaux', false, '', true, 'ci_macon-11-fer-16')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Agglo 10', '', 'unité', 275, 'materiaux', false, 'agglo bloc parpaing', true, 'ci_macon-12-agglo-10')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Agglo 15', '', 'unité', 350, 'materiaux', true, 'agglo bloc parpaing', true, 'ci_macon-13-agglo-15')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Agglo 20', '', 'unité', 425, 'materiaux', false, 'agglo bloc parpaing', true, 'ci_macon-14-agglo-20')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Brique rouge', '', 'unité', 200, 'materiaux', false, '', true, 'ci_macon-15-brique-rouge')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Coffrage', '', 'forfait', 35000, 'services', false, '', true, 'ci_macon-16-coffrage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Main-d’œuvre maçonnerie', '', 'forfait', 150000, 'services', true, 'main oeuvre macon', true, 'ci_macon-17-main-d-uvre-maconnerie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'maçon', 'Transport', '', 'voyage', 15000, 'services', true, '', true, 'ci_macon-18-transport')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PVC 20', '', 'barre', 2200, 'sanitaire', false, 'tube pvc tuyau', true, 'ci_plombier-0-pvc-20')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PVC 25', '', 'barre', 3000, 'sanitaire', false, '', true, 'ci_plombier-1-pvc-25')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PVC 32', '', 'barre', 4200, 'sanitaire', true, '', true, 'ci_plombier-2-pvc-32')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PVC 40', '', 'barre', 6000, 'sanitaire', false, '', true, 'ci_plombier-3-pvc-40')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Coude', '', 'unité', 550, 'sanitaire', true, '', true, 'ci_plombier-4-coude')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Té', '', 'unité', 750, 'sanitaire', true, '', true, 'ci_plombier-5-te')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Vanne', '', 'unité', 3500, 'sanitaire', false, '', true, 'ci_plombier-6-vanne')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Robinet', '', 'unité', 8500, 'sanitaire', true, '', true, 'ci_plombier-7-robinet')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Flexible', '', 'unité', 1500, 'sanitaire', false, '', true, 'ci_plombier-8-flexible')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Joint', '', 'unité', 250, 'sanitaire', false, '', true, 'ci_plombier-9-joint')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Colle PVC', '', 'unité', 3200, 'sanitaire', false, '', true, 'ci_plombier-10-colle-pvc')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PPR 20', '', 'barre', 3800, 'sanitaire', false, '', true, 'ci_plombier-11-ppr-20')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'PPR 25', '', 'barre', 5200, 'sanitaire', false, '', true, 'ci_plombier-12-ppr-25')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Chauffe-eau', '', 'unité', 95000, 'sanitaire', false, '', true, 'ci_plombier-13-chauffe-eau')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'WC complet', '', 'unité', 85000, 'sanitaire', false, '', true, 'ci_plombier-14-wc-complet')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Lavabo', '', 'unité', 45000, 'sanitaire', false, '', true, 'ci_plombier-15-lavabo')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Main-d’œuvre plomberie', '', 'forfait', 85000, 'services', true, '', true, 'ci_plombier-16-main-d-uvre-plomberie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Pose', '', 'unité', 12000, 'services', true, '', true, 'ci_plombier-17-pose')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'plombier', 'Déplacement', '', 'forfait', 5000, 'services', false, '', true, 'ci_plombier-18-deplacement')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Câble 1,5', '', 'rouleau', 12500, 'electrique', true, 'cable fil souple', true, 'ci_electricien-0-cable-1-5')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Câble 2,5', '', 'rouleau', 18500, 'electrique', true, '', true, 'ci_electricien-1-cable-2-5')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Câble 4', '', 'rouleau', 26000, 'electrique', false, '', true, 'ci_electricien-2-cable-4')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Câble 6', '', 'rouleau', 38000, 'electrique', false, '', true, 'ci_electricien-3-cable-6')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Disjoncteur', '', 'unité', 6500, 'electrique', true, '', true, 'ci_electricien-4-disjoncteur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Prise', '', 'unité', 1800, 'electrique', true, '', true, 'ci_electricien-5-prise')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Interrupteur', '', 'unité', 1500, 'electrique', true, '', true, 'ci_electricien-6-interrupteur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Gaine', '', 'barre', 750, 'electrique', false, '', true, 'ci_electricien-7-gaine')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Boîte d’encastrement', '', 'unité', 350, 'electrique', false, '', true, 'ci_electricien-8-boite-d-encastrement')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Tableau électrique', '', 'unité', 45000, 'electrique', false, '', true, 'ci_electricien-9-tableau-electrique')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Ampoule LED', '', 'unité', 1500, 'electrique', false, '', true, 'ci_electricien-10-ampoule-led')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Réglette LED', '', 'unité', 9500, 'electrique', false, '', true, 'ci_electricien-11-reglette-led')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Douille', '', 'unité', 800, 'electrique', false, '', true, 'ci_electricien-12-douille')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Domino', '', 'unité', 150, 'electrique', false, '', true, 'ci_electricien-13-domino')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Main-d’œuvre électricité', '', 'forfait', 75000, 'services', true, '', true, 'ci_electricien-14-main-d-uvre-electricite')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Installation', '', 'unité', 5000, 'services', false, '', true, 'ci_electricien-15-installation')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'electricien', 'Dépannage', '', 'forfait', 15000, 'services', true, '', true, 'ci_electricien-16-depannage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Peinture acrylique', '', 'unité', 18500, 'finition', true, 'peinture pot seau', true, 'ci_peintre-0-peinture-acrylique')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Peinture à l’huile', '', 'unité', 22000, 'finition', false, '', true, 'ci_peintre-1-peinture-a-l-huile')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Sous-couche', '', 'unité', 14500, 'finition', true, '', true, 'ci_peintre-2-sous-couche')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Enduit de lissage', '', 'sac', 6500, 'finition', true, '', true, 'ci_peintre-3-enduit-de-lissage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Mastic', '', 'kg', 1800, 'finition', false, '', true, 'ci_peintre-4-mastic')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Rouleau', '', 'unité', 2500, 'outillage', true, '', true, 'ci_peintre-5-rouleau')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Pinceau', '', 'unité', 1200, 'outillage', false, '', true, 'ci_peintre-6-pinceau')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Brosse', '', 'unité', 1000, 'outillage', false, '', true, 'ci_peintre-7-brosse')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Papier abrasif', '', 'unité', 500, 'outillage', false, '', true, 'ci_peintre-8-papier-abrasif')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Bâche de protection', '', 'unité', 3500, 'outillage', false, '', true, 'ci_peintre-9-bache-de-protection')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Diluant', '', 'litre', 2200, 'finition', false, '', true, 'ci_peintre-10-diluant')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Préparation des supports', '', 'm2', 1200, 'services', true, '', true, 'ci_peintre-11-preparation-des-supports')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Finition', '', 'm2', 1500, 'services', false, '', true, 'ci_peintre-12-finition')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'peintre', 'Main-d’œuvre peinture', '', 'forfait', 45000, 'services', true, '', true, 'ci_peintre-13-main-d-uvre-peinture')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Planche', '', 'unité', 6500, 'materiaux', true, 'planche bois', true, 'ci_menuisier-0-planche')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Bois chevron', '', 'unité', 4500, 'materiaux', false, '', true, 'ci_menuisier-1-bois-chevron')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Contreplaqué', '', 'unité', 18500, 'materiaux', true, '', true, 'ci_menuisier-2-contreplaque')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'MDF', '', 'unité', 22000, 'materiaux', false, '', true, 'ci_menuisier-3-mdf')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Porte bois', '', 'unité', 45000, 'materiaux', true, '', true, 'ci_menuisier-4-porte-bois')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Cadre de porte', '', 'unité', 25000, 'materiaux', false, '', true, 'ci_menuisier-5-cadre-de-porte')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Charnière', '', 'unité', 1200, 'materiaux', false, '', true, 'ci_menuisier-6-charniere')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Serrure', '', 'unité', 12500, 'materiaux', true, '', true, 'ci_menuisier-7-serrure')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Poignée', '', 'unité', 3500, 'materiaux', false, '', true, 'ci_menuisier-8-poignee')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Vis à bois', '', 'kg', 2200, 'materiaux', false, '', true, 'ci_menuisier-9-vis-a-bois')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Colle à bois', '', 'unité', 2800, 'materiaux', false, '', true, 'ci_menuisier-10-colle-a-bois')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Vernis', '', 'litre', 4500, 'finition', false, '', true, 'ci_menuisier-11-vernis')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Main-d’œuvre menuiserie', '', 'forfait', 95000, 'services', true, '', true, 'ci_menuisier-12-main-d-uvre-menuiserie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'menuisier', 'Pose', '', 'unité', 15000, 'services', false, '', true, 'ci_menuisier-13-pose')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Carrelage 40x40', '', 'm2', 6500, 'materiaux', true, 'carrelage carreau sol', true, 'ci_carreleur-0-carrelage-40x40')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Carrelage 60x60', '', 'm2', 9500, 'materiaux', true, '', true, 'ci_carreleur-1-carrelage-60x60')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Faïence murale', '', 'm2', 7800, 'materiaux', false, '', true, 'ci_carreleur-2-faience-murale')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Colle à carrelage', '', 'sac', 4800, 'materiaux', true, '', true, 'ci_carreleur-3-colle-a-carrelage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Joint de carrelage', '', 'sac', 3500, 'materiaux', false, '', true, 'ci_carreleur-4-joint-de-carrelage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Croisillons', '', 'unité', 1500, 'materiaux', false, '', true, 'ci_carreleur-5-croisillons')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Plinthe', '', 'm', 1800, 'materiaux', false, '', true, 'ci_carreleur-6-plinthe')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Ciment CPJ 45', '', 'sac', 5500, 'materiaux', false, '', true, 'ci_carreleur-7-ciment-cpj-45')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Sable', '', 'voyage', 35000, 'materiaux', false, '', true, 'ci_carreleur-8-sable')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Meuleuse', '', 'unité', 35000, 'outillage', false, '', true, 'ci_carreleur-9-meuleuse')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Main-d’œuvre carrelage', '', 'forfait', 65000, 'services', true, '', true, 'ci_carreleur-10-main-d-uvre-carrelage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'carreleur', 'Pose carrelage', '', 'm2', 2500, 'services', true, '', true, 'ci_carreleur-11-pose-carrelage')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Fer 12', '', 'barre', 9500, 'materiaux', true, '', true, 'ci_soudeur-0-fer-12')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Fer 16', '', 'barre', 16500, 'materiaux', true, '', true, 'ci_soudeur-1-fer-16')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Fer 20', '', 'barre', 25000, 'materiaux', false, '', true, 'ci_soudeur-2-fer-20')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Fer cornière', '', 'barre', 12500, 'materiaux', false, '', true, 'ci_soudeur-3-fer-corniere')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Tôle', '', 'unité', 22000, 'materiaux', true, 'tole bac', true, 'ci_soudeur-4-tole')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Tube carré', '', 'barre', 8500, 'materiaux', false, '', true, 'ci_soudeur-5-tube-carre')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Électrode', '', 'kg', 3500, 'materiaux', true, '', true, 'ci_soudeur-6-electrode')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Gaz soudure', '', 'unité', 18000, 'materiaux', false, '', true, 'ci_soudeur-7-gaz-soudure')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Disque à tronçonner', '', 'unité', 2500, 'outillage', false, '', true, 'ci_soudeur-8-disque-a-tronconner')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Peinture antirouille', '', 'unité', 9500, 'finition', false, '', true, 'ci_soudeur-9-peinture-antirouille')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Main-d’œuvre soudure', '', 'forfait', 65000, 'services', true, '', true, 'ci_soudeur-10-main-d-uvre-soudure')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'soudeur', 'Soudure sur site', '', 'heure', 5000, 'services', false, '', true, 'ci_soudeur-11-soudure-sur-site')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Climatiseur 1 CV', '', 'unité', 185000, 'materiaux', true, 'clim split climatiseur', true, 'ci_climaticien-0-climatiseur-1-cv')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Climatiseur 1,5 CV', '', 'unité', 235000, 'materiaux', true, '', true, 'ci_climaticien-1-climatiseur-1-5-cv')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Climatiseur 2 CV', '', 'unité', 320000, 'materiaux', false, '', true, 'ci_climaticien-2-climatiseur-2-cv')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Support climatiseur', '', 'unité', 12000, 'materiaux', false, '', true, 'ci_climaticien-3-support-climatiseur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Tuyau cuivre', '', 'm', 6500, 'materiaux', true, '', true, 'ci_climaticien-4-tuyau-cuivre')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Gaz R410', '', 'kg', 15000, 'materiaux', false, '', true, 'ci_climaticien-5-gaz-r410')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Câble 2,5', '', 'rouleau', 18500, 'electrique', false, '', true, 'ci_climaticien-6-cable-2-5')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Disjoncteur', '', 'unité', 6500, 'electrique', false, '', true, 'ci_climaticien-7-disjoncteur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Télécommande', '', 'unité', 8500, 'materiaux', false, '', true, 'ci_climaticien-8-telecommande')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Main-d’œuvre climatisation', '', 'forfait', 45000, 'services', true, '', true, 'ci_climaticien-9-main-d-uvre-climatisation')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Entretien climatiseur', '', 'unité', 15000, 'services', true, '', true, 'ci_climaticien-10-entretien-climatiseur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'climaticien', 'Recharge gaz', '', 'unité', 25000, 'services', false, '', true, 'ci_climaticien-11-recharge-gaz')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Huile moteur', '', 'litre', 4500, 'materiaux', true, 'huile vidange', true, 'ci_mecanicien-0-huile-moteur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Filtre à huile', '', 'unité', 6500, 'materiaux', true, '', true, 'ci_mecanicien-1-filtre-a-huile')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Filtre à air', '', 'unité', 8500, 'materiaux', false, '', true, 'ci_mecanicien-2-filtre-a-air')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Filtre à gasoil', '', 'unité', 9500, 'materiaux', false, '', true, 'ci_mecanicien-3-filtre-a-gasoil')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Plaquettes de frein', '', 'unité', 12500, 'materiaux', true, '', true, 'ci_mecanicien-4-plaquettes-de-frein')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Bougie', '', 'unité', 4500, 'materiaux', false, '', true, 'ci_mecanicien-5-bougie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Batterie', '', 'unité', 55000, 'materiaux', true, '', true, 'ci_mecanicien-6-batterie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Courroie', '', 'unité', 15000, 'materiaux', false, '', true, 'ci_mecanicien-7-courroie')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Pneu', '', 'unité', 45000, 'materiaux', false, '', true, 'ci_mecanicien-8-pneu')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Liquide de frein', '', 'litre', 3500, 'materiaux', false, '', true, 'ci_mecanicien-9-liquide-de-frein')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Main-d’œuvre mécanique', '', 'forfait', 25000, 'services', true, '', true, 'ci_mecanicien-10-main-d-uvre-mecanique')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Diagnostic', '', 'forfait', 10000, 'services', true, '', true, 'ci_mecanicien-11-diagnostic')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'mecanicien', 'Sortie véhicule', '', 'forfait', 15000, 'services', false, '', true, 'ci_mecanicien-12-sortie-vehicule')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Ciment CPJ 45', '', 'sac', 5500, 'materiaux', true, '', true, 'ci_quincaillier-0-ciment-cpj-45')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Fer 6', '', 'barre', 2500, 'materiaux', true, '', true, 'ci_quincaillier-1-fer-6')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Fer 8', '', 'barre', 4500, 'materiaux', true, '', true, 'ci_quincaillier-2-fer-8')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Fer 10', '', 'barre', 6500, 'materiaux', false, '', true, 'ci_quincaillier-3-fer-10')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Fer 12', '', 'barre', 9500, 'materiaux', false, '', true, 'ci_quincaillier-4-fer-12')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Agglo 15', '', 'unité', 350, 'materiaux', true, '', true, 'ci_quincaillier-5-agglo-15')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Agglo 20', '', 'unité', 425, 'materiaux', false, '', true, 'ci_quincaillier-6-agglo-20')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Tube PVC 32', '', 'barre', 4200, 'sanitaire', false, '', true, 'ci_quincaillier-7-tube-pvc-32')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Robinet', '', 'unité', 8500, 'sanitaire', false, '', true, 'ci_quincaillier-8-robinet')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Câble 1,5', '', 'rouleau', 12500, 'electrique', false, '', true, 'ci_quincaillier-9-cable-1-5')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Câble 2,5', '', 'rouleau', 18500, 'electrique', false, '', true, 'ci_quincaillier-10-cable-2-5')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Prise', '', 'unité', 1800, 'electrique', false, '', true, 'ci_quincaillier-11-prise')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Interrupteur', '', 'unité', 1500, 'electrique', false, '', true, 'ci_quincaillier-12-interrupteur')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Ampoule LED', '', 'unité', 1500, 'electrique', false, '', true, 'ci_quincaillier-13-ampoule-led')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Peinture acrylique', '', 'unité', 18500, 'finition', false, '', true, 'ci_quincaillier-14-peinture-acrylique')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Marteau', '', 'unité', 5500, 'outillage', false, '', true, 'ci_quincaillier-15-marteau')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Truelle', '', 'unité', 2500, 'outillage', false, '', true, 'ci_quincaillier-16-truelle')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Mètre ruban', '', 'unité', 2200, 'outillage', false, '', true, 'ci_quincaillier-17-metre-ruban')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Niveau à bulle', '', 'unité', 6500, 'outillage', false, '', true, 'ci_quincaillier-18-niveau-a-bulle')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Pelle', '', 'unité', 4500, 'outillage', false, '', true, 'ci_quincaillier-19-pelle')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Brouette', '', 'unité', 35000, 'outillage', false, '', true, 'ci_quincaillier-20-brouette')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'quincaillier', 'Livraison', '', 'forfait', 15000, 'services', false, '', true, 'ci_quincaillier-21-livraison')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Article divers', '', 'unité', 5000, 'divers', true, '', true, 'ci_commercant-0-article-divers')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Sac de riz 50 kg', '', 'sac', 32000, 'divers', true, '', true, 'ci_commercant-1-sac-de-riz-50-kg')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Huile 5 L', '', 'unité', 8500, 'divers', false, '', true, 'ci_commercant-2-huile-5-l')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Carton de savon', '', 'carton', 12000, 'divers', false, '', true, 'ci_commercant-3-carton-de-savon')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Bouteille d’eau', '', 'unité', 300, 'divers', false, '', true, 'ci_commercant-4-bouteille-d-eau')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Boîte de tomate', '', 'carton', 15000, 'divers', false, '', true, 'ci_commercant-5-boite-de-tomate')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Spaghetti (carton)', '', 'carton', 9000, 'divers', false, '', true, 'ci_commercant-6-spaghetti-carton')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Sucre 50 kg', '', 'sac', 35000, 'divers', false, '', true, 'ci_commercant-7-sucre-50-kg')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'commercant', 'Livraison', '', 'forfait', 15000, 'services', false, '', true, 'ci_commercant-8-livraison')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'autre', 'Fourniture', '', 'forfait', 25000, 'divers', true, '', true, 'ci_autre-0-fourniture')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'autre', 'Main-d’œuvre', '', 'forfait', 100000, 'services', true, '', true, 'ci_autre-1-main-d-uvre')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;
insert into catalog_items (business_id, profession_id, name, description, unit, default_price, category, favorite, keywords, active, local_id) values (
  null, 'autre', 'Transport', '', 'forfait', 15000, 'services', false, '', true, 'ci_autre-2-transport')
  on conflict (local_id) where business_id is null do update set
    name = excluded.name, description = excluded.description, unit = excluded.unit,
    default_price = excluded.default_price, category = excluded.category,
    favorite = excluded.favorite, keywords = excluded.keywords, active = excluded.active;

-- Note : les prix ci-dessus sont des repères indicatifs pour le Togo ;
-- chaque entreprise peut les modifier, la modification ne touche jamais
-- un document déjà créé (les lignes enregistrent leur propre prix).
