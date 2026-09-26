alter table public.quotes_cache
  add column source text not null default 'alpha_vantage'
    check (source in ('alpha_vantage', 'finnhub', 'ai_web_search')),
  add column source_url text;

-- Cache negativo: evita repetir pedidos a fornecedores para tickers que falharam há pouco.
-- Só acedido pelo backend com a service_role (RLS ativo, sem policies = sem acesso para anon/authenticated).
create table public.quote_lookup_failures (
  ticker text primary key,
  reason text not null check (reason in ('not_found', 'unavailable')),
  detail text,
  failed_at timestamptz not null default now()
);

alter table public.quote_lookup_failures enable row level security;
