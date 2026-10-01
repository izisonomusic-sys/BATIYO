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
