-- La période de grâce conserve les droits même si le webhook a marqué l'abonnement expiré.
create or replace function public.get_document_quota()
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_business_id uuid := public.current_business_id();
  v_quotes integer := 0; v_invoices integer := 0;
  v_plan text := 'free'; v_status text := 'free'; v_grace_until timestamptz; v_starts_at timestamptz;
  v_paid boolean := false;
begin
  if auth.uid() is null or v_business_id is null then raise exception 'Authentification requise.'; end if;
  select count(*)::integer into v_quotes from public.quotes where business_id = v_business_id;
  select count(*)::integer into v_invoices from public.invoices where business_id = v_business_id;
  select s.plan_id, s.status, s.starts_at, coalesce(s.grace_until, s.ends_at + interval '7 days')
    into v_plan, v_status, v_starts_at, v_grace_until from public.business_subscriptions s
    where s.business_id = v_business_id order by s.created_at desc limit 1;
  v_paid := coalesce(v_status in ('active','past_due','expired') and v_grace_until is not null
    and now() <= v_grace_until and (v_starts_at is null or now() >= v_starts_at), false);
  return jsonb_build_object('plan', case when v_paid then coalesce(v_plan, 'pro') else 'free' end,
    'subscription_active', v_paid, 'subscription_status', coalesce(v_status, 'free'), 'grace_until', v_grace_until,
    'quotes_used', v_quotes, 'invoices_used', v_invoices, 'quotes_limit', 10, 'invoices_limit', 10,
    'quotes_remaining', greatest(10-v_quotes,0), 'invoices_remaining', greatest(10-v_invoices,0));
end; $$;

create or replace function public.can_export_document(p_document_type text, p_document_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_business_id uuid := public.current_business_id();
  v_created_at timestamptz; v_rank integer; v_used integer;
  v_plan text := 'free'; v_status text := 'free'; v_grace_until timestamptz; v_starts_at timestamptz;
  v_paid boolean := false; v_allowed boolean := false;
begin
  if auth.uid() is null or v_business_id is null then raise exception 'Authentification requise.'; end if;
  if p_document_type not in ('quote','invoice') then raise exception 'Type de document invalide.'; end if;
  if p_document_type = 'quote' then
    select created_at into v_created_at from public.quotes where id=p_document_id and business_id=v_business_id;
    if not found then raise exception 'Devis introuvable.'; end if;
    select count(*)::integer into v_used from public.quotes where business_id=v_business_id;
    select count(*)::integer into v_rank from public.quotes where business_id=v_business_id
      and (created_at < v_created_at or (created_at = v_created_at and id <= p_document_id));
  else
    select created_at into v_created_at from public.invoices where id=p_document_id and business_id=v_business_id;
    if not found then raise exception 'Facture introuvable.'; end if;
    select count(*)::integer into v_used from public.invoices where business_id=v_business_id;
    select count(*)::integer into v_rank from public.invoices where business_id=v_business_id
      and (created_at < v_created_at or (created_at = v_created_at and id <= p_document_id));
  end if;
  select s.plan_id, s.status, s.starts_at, coalesce(s.grace_until, s.ends_at + interval '7 days')
    into v_plan, v_status, v_starts_at, v_grace_until from public.business_subscriptions s
    where s.business_id=v_business_id order by s.created_at desc limit 1;
  v_paid := coalesce(v_status in ('active','past_due','expired') and v_grace_until is not null
    and now() <= v_grace_until and (v_starts_at is null or now() >= v_starts_at), false);
  v_allowed := v_rank <= 10 or v_paid;
  return jsonb_build_object('allowed',v_allowed,'reason',case when v_allowed then 'entitled' else 'free_quota_exhausted' end,
    'document_type',p_document_type,'document_rank',v_rank,'used',v_used,'limit',10,
    'remaining',greatest(10-v_used,0),'plan',case when v_paid then coalesce(v_plan,'pro') else 'free' end,
    'subscription_active',v_paid,'grace_until',v_grace_until);
end; $$;

revoke all on function public.get_document_quota() from public, anon;
revoke all on function public.can_export_document(text, uuid) from public, anon;
grant execute on function public.get_document_quota() to authenticated;
grant execute on function public.can_export_document(text, uuid) to authenticated;
