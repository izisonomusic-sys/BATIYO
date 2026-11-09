-- Index the PayDunya IPN lookup by provider and invoice token.
-- Country/operator details are stored in the existing business_subscriptions.metadata JSONB column;
-- no new table or country-specific schema is needed for the six XOF SoftPay markets.
CREATE INDEX IF NOT EXISTS business_subscriptions_provider_reference_idx
  ON public.business_subscriptions (provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
