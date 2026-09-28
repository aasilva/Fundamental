-- Câmbios para euros (quantos EUR vale 1 unidade da moeda). Só acedidos pelo backend (service_role).
create table public.fx_rates_latest (
  currency text primary key check (currency ~ '^[A-Z]{3}$'),
  eur_rate numeric(20,10) not null check (eur_rate > 0),
  rate_date date not null,
  fetched_at timestamptz not null default now()
);

-- Câmbios históricos nunca mudam: cache permanente, por data pedida (data de compra da posição).
create table public.fx_rates_historical (
  rate_date date not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  eur_rate numeric(20,10) not null check (eur_rate > 0),
  source_date date not null,
  fetched_at timestamptz not null default now(),
  primary key (rate_date, currency)
);

alter table public.fx_rates_latest enable row level security;
alter table public.fx_rates_historical enable row level security;
