-- Holdings: acções que o utilizador possui
create table public.holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  ticker text not null,
  name text,
  quantity numeric(18,6) not null check (quantity > 0),
  entry_price numeric(18,4) not null check (entry_price >= 0),
  entry_date date not null,
  currency text not null default 'EUR',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index holdings_user_id_idx on public.holdings(user_id);
create index holdings_ticker_idx on public.holdings(ticker);

-- Cache de cotações (partilhado entre utilizadores, atualizado pelo backend)
create table public.quotes_cache (
  ticker text primary key,
  price numeric(18,4) not null,
  currency text not null default 'USD',
  previous_close numeric(18,4),
  fetched_at timestamptz not null default now()
);

-- Preferências de notificações por utilizador
create table public.notification_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_summary_enabled boolean not null default true,
  alert_threshold_pct numeric(6,2) not null default 5.0,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger holdings_set_updated_at
  before update on public.holdings
  for each row execute function public.set_updated_at();

create trigger notification_settings_set_updated_at
  before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- RLS
alter table public.holdings enable row level security;
alter table public.quotes_cache enable row level security;
alter table public.notification_settings enable row level security;

create policy "holdings_select_own" on public.holdings
  for select using (auth.uid() = user_id);
create policy "holdings_insert_own" on public.holdings
  for insert with check (auth.uid() = user_id);
create policy "holdings_update_own" on public.holdings
  for update using (auth.uid() = user_id);
create policy "holdings_delete_own" on public.holdings
  for delete using (auth.uid() = user_id);

-- quotes_cache: leitura para qualquer utilizador autenticado; escrita só via service_role (bypassa RLS)
create policy "quotes_cache_select_authenticated" on public.quotes_cache
  for select using (auth.role() = 'authenticated');

create policy "notification_settings_select_own" on public.notification_settings
  for select using (auth.uid() = user_id);
create policy "notification_settings_insert_own" on public.notification_settings
  for insert with check (auth.uid() = user_id);
create policy "notification_settings_update_own" on public.notification_settings
  for update using (auth.uid() = user_id);

-- Cria automaticamente as preferências de notificação quando um utilizador se regista
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notification_settings (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
