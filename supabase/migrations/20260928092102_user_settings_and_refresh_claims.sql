-- notification_settings passa a guardar também preferências de cotações: renomear para user_settings.
alter table public.notification_settings rename to user_settings;
alter table public.user_settings rename constraint notification_settings_pkey to user_settings_pkey;
alter table public.user_settings rename constraint notification_settings_user_id_fkey to user_settings_user_id_fkey;
alter trigger notification_settings_set_updated_at on public.user_settings rename to user_settings_set_updated_at;
alter policy "notification_settings_select_own" on public.user_settings rename to "user_settings_select_own";
alter policy "notification_settings_insert_own" on public.user_settings rename to "user_settings_insert_own";
alter policy "notification_settings_update_own" on public.user_settings rename to "user_settings_update_own";

alter table public.user_settings
  add column quote_refresh_minutes integer not null default 60
    check (quote_refresh_minutes between 5 and 1440);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id);
  return new;
end;
$$;

-- Evita que dois pedidos simultâneos atualizem o mesmo ticker (e paguem a pesquisa AI duas vezes).
create table public.quote_refresh_claims (
  ticker text primary key,
  claimed_at timestamptz not null default now()
);
alter table public.quote_refresh_claims enable row level security;

-- Devolve os tickers que este pedido ganhou o direito de atualizar.
create or replace function public.claim_quote_refresh(p_tickers text[], p_claim_seconds integer)
returns setof text
language sql
security invoker
set search_path = public
as $$
  insert into public.quote_refresh_claims as c (ticker, claimed_at)
  select distinct t, now() from unnest(p_tickers) as t
  on conflict (ticker) do update set claimed_at = excluded.claimed_at
    where c.claimed_at < now() - make_interval(secs => p_claim_seconds)
  returning c.ticker;
$$;

revoke execute on function public.claim_quote_refresh(text[], integer) from public, anon, authenticated;
grant execute on function public.claim_quote_refresh(text[], integer) to service_role;
