-- BATIYO: inscription par téléphone, session sans confirmation SMS et quota gratuit à vie.
-- Les 10 premiers devis et les 10 premières factures restent exportables.
-- Les documents supplémentaires peuvent être créés, mais leur export/partage exige un abonnement actif.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_name text;
  v_profession text;
  v_phone text;
begin
  v_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.phone, ''),
    'Nouvel utilisateur'
  );
  v_profession := nullif(new.raw_user_meta_data ->> 'profession_id', '');
  v_phone := coalesce(nullif(new.phone, ''), nullif(new.raw_user_meta_data ->> 'phone', ''));

  insert into public.businesses (name, manager_name, phone, email, created_by)
  values (
    coalesce(nullif(new.raw_user_meta_data ->> 'business_name', ''), 'Mon entreprise'),
    v_name,
    v_phone,
    new.email,
    new.id
  )
  returning id into v_business_id;

  insert into public.profiles (
    id, business_id, profession_id, full_name, phone, email, address,
    role, onboarding_done, created_by
  )
  values (
    new.id, v_business_id, v_profession, v_name, v_phone, new.email, null,
    'proprietaire', true, new.id
  );

  insert into public.settings (business_id, created_by)
  values (v_business_id, new.id);

  return new;
end;
$$;

-- Abonnements: les écritures seront réservées au webhook/service role PayDunya.
create table if not exists public.business_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  plan_id text not null,
  status text not null default 'pending'
    check (status in ('pending','active','past_due','expired','cancelled','failed')),
  billing_period_months integer not null default 1
    check (billing_period_months in (1,2,6,12)),
  amount_fcfa integer not null default 0 check (amount_fcfa >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  grace_until timestamptz,
  provider text,
  provider_reference text,
  payment_reference text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_subscriptions_business_created_idx
  on public.business_subscriptions (business_id, created_at desc);
create unique index if not exists business_subscriptions_provider_reference_uidx
  on public.business_subscriptions (provider, provider_reference)
  where provider is not null and provider_reference is not null;

alter table public.business_subscriptions enable row level security;
revoke all on public.business_subscriptions from anon, authenticated;
grant select on public.business_subscriptions to authenticated;
drop policy if exists "members can view their subscription" on public.business_subscriptions;
create policy "members can view their subscription"
  on public.business_subscriptions
  for select to authenticated
  using (business_id = public.current_business_id());

-- Résumé des quotas d'essai. Le quota est à vie et ne se réinitialise pas par mois.
create or replace function public.get_document_quota()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_quotes integer := 0;
  v_invoices integer := 0;
  v_plan text := 'free';
  v_status text := 'free';
  v_grace_until timestamptz;
  v_paid boolean := false;
begin
  if auth.uid() is null or v_business_id is null then
    raise exception 'Authentification requise.';
  end if;

  select count(*)::integer into v_quotes
    from public.quotes where business_id = v_business_id;
  select count(*)::integer into v_invoices
    from public.invoices where business_id = v_business_id;

  select s.plan_id, s.status, coalesce(s.grace_until, s.ends_at + interval '7 days')
    into v_plan, v_status, v_grace_until
    from public.business_subscriptions s
    where s.business_id = v_business_id
    order by s.created_at desc
    limit 1;

  v_paid := coalesce(v_status = 'active' and (v_grace_until is null or now() <= v_grace_until), false);

  return jsonb_build_object(
    'plan', case when v_paid then coalesce(v_plan, 'pro') else 'free' end,
    'subscription_active', v_paid,
    'subscription_status', coalesce(v_status, 'free'),
    'grace_until', v_grace_until,
    'quotes_used', v_quotes,
    'invoices_used', v_invoices,
    'quotes_limit', 10,
    'invoices_limit', 10,
    'quotes_remaining', greatest(10 - v_quotes, 0),
    'invoices_remaining', greatest(10 - v_invoices, 0)
  );
end;
$$;

-- Autorise l'export uniquement des dix premiers documents de chaque type en gratuit.
-- Les documents au-delà du quota restent enregistrables comme brouillons.
create or replace function public.can_export_document(
  p_document_type text,
  p_document_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_created_at timestamptz;
  v_rank integer;
  v_used integer;
  v_plan text := 'free';
  v_status text := 'free';
  v_grace_until timestamptz;
  v_paid boolean := false;
  v_allowed boolean := false;
begin
  if auth.uid() is null or v_business_id is null then
    raise exception 'Authentification requise.';
  end if;
  if p_document_type not in ('quote','invoice') then
    raise exception 'Type de document invalide.';
  end if;

  if p_document_type = 'quote' then
    select created_at into v_created_at
      from public.quotes
      where id = p_document_id and business_id = v_business_id;
    if not found then raise exception 'Devis introuvable.'; end if;
    select count(*)::integer into v_used
      from public.quotes where business_id = v_business_id;
    select count(*)::integer into v_rank
      from public.quotes
      where business_id = v_business_id
        and (created_at < v_created_at or (created_at = v_created_at and id <= p_document_id));
  else
    select created_at into v_created_at
      from public.invoices
      where id = p_document_id and business_id = v_business_id;
    if not found then raise exception 'Facture introuvable.'; end if;
    select count(*)::integer into v_used
      from public.invoices where business_id = v_business_id;
    select count(*)::integer into v_rank
      from public.invoices
      where business_id = v_business_id
        and (created_at < v_created_at or (created_at = v_created_at and id <= p_document_id));
  end if;

  select s.plan_id, s.status, coalesce(s.grace_until, s.ends_at + interval '7 days')
    into v_plan, v_status, v_grace_until
    from public.business_subscriptions s
    where s.business_id = v_business_id
    order by s.created_at desc
    limit 1;

  v_paid := coalesce(v_status = 'active' and (v_grace_until is null or now() <= v_grace_until), false);
  v_allowed := v_rank <= 10 or v_paid;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', case when v_allowed then 'entitled' when v_paid then 'paid' else 'free_quota_exhausted' end,
    'document_type', p_document_type,
    'document_rank', v_rank,
    'used', v_used,
    'limit', 10,
    'remaining', greatest(10 - v_used, 0),
    'plan', case when v_paid then coalesce(v_plan, 'pro') else 'free' end,
    'subscription_active', v_paid,
    'grace_until', v_grace_until
  );
end;
$$;

revoke all on function public.get_document_quota() from public, anon;
revoke all on function public.can_export_document(text, uuid) from public, anon;
grant execute on function public.get_document_quota() to authenticated;
grant execute on function public.can_export_document(text, uuid) to authenticated;
