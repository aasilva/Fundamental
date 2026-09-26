alter table public.holdings
  add constraint holdings_currency_iso check (currency ~ '^[A-Z]{3}$');
