-- BATIYO — durcissement des fonctions SECURITY DEFINER
-- Les fonctions de trigger/interne ne doivent pas être appelables via l'API PostgREST.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.set_document_number() from anon, authenticated;
revoke execute on function public.refresh_invoice_payment() from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;
revoke execute on function public.next_document_number(text, uuid) from anon, authenticated;
grant execute on function public.current_business_id() to authenticated;
grant execute on function public.current_profession_id() to authenticated;
grant execute on function public.is_member(uuid) to authenticated;
