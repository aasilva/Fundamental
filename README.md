# Fundamental — carteira de ações

App para acompanhar a tua carteira de ações: datas de entrada, cotações atuais,
lucros/prejuízos, com login e notificações automáticas por email.

Stack: **Next.js (App Router)** + **Supabase** (base de dados PostgreSQL, Auth,
RLS) + **Alpha Vantage** (cotações) + **Resend** (emails).

## Funcionalidades

- Registo/login por email + palavra-passe (Supabase Auth)
- CRUD de posições: ticker, quantidade, preço/data de entrada, moeda, notas
- Cotações atuais via Alpha Vantage, com cache em base de dados
- Cálculo automático de valor atual, lucro/prejuízo (absoluto e %) por posição e no total da carteira
- Resumo diário por email + alerta quando a variação da carteira ultrapassa um limite definido pelo utilizador
- Row Level Security: cada utilizador só vê e edita as suas próprias posições

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Base de dados (Supabase)

O projeto Supabase `fundamental` já tem o esquema aplicado (tabelas
`holdings`, `quotes_cache`, `notification_settings`, com RLS e triggers).
Se precisares de recriar o projeto, o SQL de setup está nas migrations
aplicadas via Supabase MCP — replica as tabelas indicadas em
`src/lib/supabase/database.types.ts`.

Vai a **Project Settings > API** no [painel Supabase](https://supabase.com/dashboard)
e copia:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` / `publishable` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key (secreta, nunca expor no browser) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Alpha Vantage (cotações)

Cria uma API key gratuita em https://www.alphavantage.co/support/#api-key e
define `ALPHA_VANTAGE_API_KEY`.

> ⚠️ O tier gratuito tem limite de **25 pedidos/dia** e **5/minuto**. As
> cotações são guardadas em cache (`quotes_cache`) durante
> `QUOTE_CACHE_TTL_MINUTES` (60 por defeito) para poupar pedidos. Se tiveres
> muitos tickers diferentes, aumenta o TTL ou considera um plano pago /
> alternativa (Finnhub, IEX Cloud, Twelve Data).

### 4. Resend (emails)

Cria conta em https://resend.com, gera uma API key em
https://resend.com/api-keys e define `RESEND_API_KEY`. Para produção,
verifica o teu próprio domínio em **Domains** e usa esse email em
`NOTIFICATIONS_FROM_EMAIL`; em desenvolvimento podes usar o remetente de
teste `onboarding@resend.dev`.

### 5. Variáveis de ambiente

Copia `.env.example` para `.env.local` e preenche todos os valores:

```bash
cp .env.example .env.local
```

`CRON_SECRET` é uma string aleatória à tua escolha (`openssl rand -hex 32`)
que protege o endpoint de cron contra chamadas não autorizadas.

### 6. Correr localmente

```bash
npm run dev
```

Abre http://localhost:3000 — deves ser redirecionado para `/login`.

## Notificações automáticas (cron)

O resumo diário é enviado pelo endpoint `GET /api/cron/daily-summary`,
protegido por `Authorization: Bearer $CRON_SECRET`.

- **Deploy na Vercel**: o `vercel.json` já define um cron diário às 07:00 UTC.
  A Vercel injeta automaticamente o header `Authorization` com o valor de
  `CRON_SECRET` quando essa env var está definida no projeto — não precisas
  de configurar nada extra além de definir `CRON_SECRET` nas env vars da
  Vercel.
- **Outro hosting**: agenda um pedido `GET` a esse endpoint (cron do
  servidor, GitHub Actions `schedule`, etc.) enviando o header
  `Authorization: Bearer <CRON_SECRET>`.

Cada utilizador controla as suas preferências em `/settings`:
resumo diário on/off e o limite de variação (%) que despoleta um alerta.

## Estrutura do projeto

```
src/
  app/
    login/, signup/          páginas + server actions de autenticação
    auth/confirm/             confirmação de email (magic link)
    holdings/                 CRUD de posições (novo, editar, eliminar)
    settings/                 preferências de notificações
    api/cron/daily-summary/   endpoint chamado pelo cron
    page.tsx                  dashboard (lista + resumo da carteira)
  lib/
    supabase/                 clientes Supabase (browser, server, admin, middleware)
    alpha-vantage.ts          integração com a API de cotações
    quotes.ts                 cache de cotações (lê/escreve em quotes_cache)
    calculations.ts           cálculo de P&L por posição e total
    email/daily-summary.ts    template do email de resumo diário
```

## Segurança

- RLS ativo em todas as tabelas de utilizador; cada policy restringe por `auth.uid()`.
- A `service_role` key só é usada em código de servidor (`lib/supabase/admin.ts`,
  route handlers) — nunca é exposta ao browser.
- O endpoint de cron exige o `CRON_SECRET` correto no header `Authorization`.
