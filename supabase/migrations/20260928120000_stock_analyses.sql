-- Análises fundamentais geradas pelo agente de investimento (pesquisa web + Claude).
create table public.stock_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  ticker text not null,
  -- Normalização para agrupar análises da mesma empresa ao longo do tempo, independentemente de maiúsculas/espaços.
  company_key text generated always as (upper(trim(ticker))) stored,
  isin text,
  company_name text,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  error text,
  model text,
  effort text,
  -- Conversa acumulada (mensagens, hosts de pesquisa, nº de turnos) para retomar entre invocações serverless
  -- quando uma análise profunda não cabe no tempo máximo de uma única invocação.
  run_state jsonb,
  locked_until timestamptz,
  report_markdown text,
  sections jsonb,
  metrics jsonb,
  sources jsonb,
  previous_analysis_id uuid references public.stock_analyses(id) on delete set null,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stock_analyses_user_id_idx on public.stock_analyses(user_id);
create index stock_analyses_company_key_idx on public.stock_analyses(company_key);

create trigger stock_analyses_set_updated_at
  before update on public.stock_analyses
  for each row execute function public.set_updated_at();

alter table public.stock_analyses enable row level security;

-- Sem policy de update para authenticated: só o service_role (o agente, em background) altera
-- conteúdo/estado. O utilizador só cria o pedido inicial e lê/apaga as suas análises.
create policy "stock_analyses_select_own" on public.stock_analyses
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "stock_analyses_insert_own" on public.stock_analyses
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "stock_analyses_delete_own" on public.stock_analyses
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Reserva atómica de uma análise para evitar que dois pedidos (ex: dois separadores) a processem
-- ao mesmo tempo e paguem a mesma pesquisa duas vezes. Mesmo padrão de claim_quote_refresh.
create or replace function public.claim_analysis(p_id uuid, p_claim_seconds integer)
returns boolean
language sql
security invoker
set search_path = public
as $$
  update public.stock_analyses
  set locked_until = now() + make_interval(secs => p_claim_seconds)
  where id = p_id
    and status in ('pending', 'running')
    and (locked_until is null or locked_until < now())
  returning true;
$$;

revoke execute on function public.claim_analysis(uuid, integer) from public, anon, authenticated;
grant execute on function public.claim_analysis(uuid, integer) to service_role;
