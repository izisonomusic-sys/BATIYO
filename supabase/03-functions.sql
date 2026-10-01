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
