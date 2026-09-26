# Fundamental — carteira de ações

App para acompanhar a tua carteira de ações: datas de entrada, cotações atuais,
lucros/prejuízos, com login e notificações automáticas por email.

Stack: **Next.js 16 (App Router)** + **Supabase** (PostgreSQL, Auth, RLS) +
**Alpha Vantage** (cotações) + **Resend** (emails) + **Vercel** (hosting e cron).

## Funcionalidades

- Registo/login por email + palavra-passe (Supabase Auth)
- CRUD de posições: ticker, quantidade, preço/data de entrada, moeda, notas
- Cotações atuais via Alpha Vantage, com cache em base de dados
- Valor atual e lucro/prejuízo (absoluto e %) por posição e totais **por moeda**
- Resumo diário por email + alerta quando a variação da carteira ultrapassa um limite definido pelo utilizador
- Row Level Security: cada utilizador só vê e edita as suas próprias posições

## Configuração local

### 1. Instalar dependências

```bash
npm install
```

### 2. Base de dados (Supabase)

O projeto Supabase `fundamental` já tem o esquema aplicado. O SQL está
versionado em `supabase/migrations/` — para recriar noutro projeto, corre os
ficheiros por ordem no SQL Editor do Supabase (ou `supabase db push` com a
Supabase CLI).

Em **Project Settings > API** no [painel Supabase](https://supabase.com/dashboard) copia:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` / `publishable` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` / `secret` key (nunca expor no browser) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Cotações (Alpha Vantage → Finnhub → pesquisa AI)

As cotações são pedidas por esta ordem; o primeiro fornecedor que responder
ganha. Cada um só é usado se a respetiva chave estiver definida.

| # | Fornecedor | Chave | Plano gratuito | Cobre |
|---|---|---|---|---|
| 1 | [Alpha Vantage](https://www.alphavantage.co/support/#api-key) | `ALPHA_VANTAGE_API_KEY` | 25 pedidos/dia, 5/min | EUA + várias bolsas (com sufixo) |
| 2 | [Finnhub](https://finnhub.io/register) | `FINNHUB_API_KEY` | 60 pedidos/min | Só EUA no plano grátis |
| 3 | Claude + pesquisa web | `ANTHROPIC_API_KEY` + `QUOTE_AI_ENABLED=true` | Pago por uso | Qualquer bolsa |

- **Formato do ticker**: ações dos EUA usam o símbolo simples (`AAPL`); na
  Alpha Vantage, outras bolsas levam sufixo (ex: `TSCO.LON`, `MBG.DEX`). A
  pesquisa AI também usa o **nome** da posição, por isso preenche-o (ex:
  "EDP - Energias de Portugal") para ações que as APIs não conhecem.
- **Moeda**: escolhe a moeda em que a ação é cotada — não há conversão
  cambial, por isso os totais aparecem separados por moeda.
- **Cache**: cotações ficam em `quotes_cache` durante `QUOTE_CACHE_TTL_MINUTES`
  (60) ou `QUOTE_AI_CACHE_TTL_MINUTES` (360) se vieram da AI. Falhas também
  ficam em cache (`quote_lookup_failures`): um ticker que nenhum fornecedor
  encontrou só é pesquisado de novo ao fim de `QUOTE_NOT_FOUND_RETRY_HOURS`
  (24); falhas temporárias (limites, rede) ao fim de
  `QUOTE_UNAVAILABLE_RETRY_MINUTES` (60). Entretanto mostra-se a última cotação conhecida.

#### Pesquisa AI (último recurso)

Usa o Claude (`claude-opus-5` por defeito, configurável em `QUOTE_AI_MODEL`)
com a ferramenta de pesquisa web. Ativa-se com `QUOTE_AI_ENABLED=true` e uma
chave de https://console.anthropic.com.

- **Fiabilidade**: um modelo pode ler mal uma página, por isso a resposta só é
  aceite se: o URL da fonte apareceu nos resultados reais da pesquisa; a moeda
  coincide com a da posição; a data da cotação tem no máximo 7 dias; e o preço
  não difere mais de 2× da última cotação conhecida. Cotações AI aparecem com
  a etiqueta **AI** (liga para a fonte) no dashboard e "(AI)" no email.
- **Custo**: $10 por 1.000 pesquisas + tokens (os resultados da pesquisa contam
  como input). Com até 3 pesquisas por cotação, estima-se **~$0.10–0.25 por
  cotação** com Claude Opus 5. Com o cache de 6h, no pior caso ~4 pesquisas por
  dia por ticker que só a AI encontra. Define um limite de gastos em
  console.anthropic.com → Limits.
- Usa o fallback do servidor da Anthropic (`fallbacks: "default"`): se o
  modelo recusar o pedido, a API tenta outro modelo automaticamente.

### 4. Resend (emails)

Cria conta em https://resend.com e gera uma API key em
https://resend.com/api-keys → `RESEND_API_KEY`.

⚠️ Com o remetente de teste `onboarding@resend.dev`, o Resend **só entrega
emails ao endereço do dono da conta Resend**. Para enviar a outros
utilizadores, verifica o teu domínio em **Domains** e define
`NOTIFICATIONS_FROM_EMAIL` (ex: `Fundamental <alertas@teudominio.pt>`).

### 5. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preenche todos os valores. `CRON_SECRET` é uma string aleatória
(`openssl rand -hex 32`); sem ela o endpoint de cron recusa todos os pedidos.

### 6. Correr

```bash
npm run dev
```

Abre http://localhost:3000 — deves ser redirecionado para `/login`.

Testes unitários (cache de cotações, cadeia de fornecedores, validação AI, cálculos):

```bash
npm test
```

## Deploy na Vercel

1. Em https://vercel.com/new, **importa o repositório** `aasilva/Fundamental`
   (a Vercel deteta Next.js automaticamente; não é preciso mudar o build).
   O branch de produção é o branch por defeito do GitHub; cada push a esse
   branch faz um novo deploy.
2. Em **Environment Variables**, adiciona todas as variáveis do
   `.env.example` antes do primeiro deploy (as `NEXT_PUBLIC_*` são embutidas
   no build). `NEXT_PUBLIC_SITE_URL` = o domínio de produção
   (ex: `https://fundamental.vercel.app`).
3. Faz deploy. O cron do `vercel.json` (todos os dias às 07:00 UTC) é
   registado automaticamente; a Vercel envia `Authorization: Bearer $CRON_SECRET`
   em cada invocação. No plano Hobby o cron corre uma vez por dia, numa hora
   aproximada.
4. **No Supabase**, em **Authentication > URL Configuration**:
   - `Site URL` = o domínio de produção da Vercel
   - `Redirect URLs`: adiciona `https://<o-teu-dominio>/auth/confirm`
     (e `http://localhost:3000/auth/confirm` para desenvolvimento)

   Sem isto, o link do email de confirmação de conta aponta para `localhost`.

Para testar o cron manualmente depois do deploy:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<o-teu-dominio>/api/cron/daily-summary
```

## Notificações

O resumo diário é enviado por `GET /api/cron/daily-summary`, protegido por
`Authorization: Bearer $CRON_SECRET`. Fora da Vercel, agenda esse pedido com
qualquer cron (servidor, GitHub Actions `schedule`, etc.).

Cada utilizador controla em `/settings` o resumo diário on/off e o limite de
variação (%) que marca o email como alerta.

## Estrutura do projeto

```
src/
  app/
    login/, signup/           páginas + server actions de autenticação
    auth/confirm/             confirmação de email (PKCE code ou token_hash)
    holdings/                 CRUD de posições (novo, editar, eliminar)
    settings/                 preferências de notificações
    api/cron/daily-summary/   endpoint chamado pelo cron
    page.tsx, loading.tsx     dashboard (lista + totais por moeda)
  components/                 botões com estado pendente / confirmação
  lib/
    supabase/                 clientes Supabase (browser, server, admin, sessão)
    quote-providers/          Alpha Vantage, Finnhub e pesquisa AI (mesma interface)
    quote-cache-policy.ts     quando refrescar + cadeia de fornecedores (testado)
    quotes.ts                 cache de cotações e de falhas na base de dados
    calculations.ts           P&L por posição e totais por moeda
    format.ts                 formatação de moeda/datas, moedas suportadas
    email/daily-summary.ts    template do email diário
  proxy.ts                    proteção de rotas (redireciona para /login)
supabase/migrations/          esquema da base de dados
```

## Segurança

- RLS ativo em todas as tabelas; as policies restringem por `(select auth.uid())`.
- A `service_role` key só é usada em módulos marcados com `server-only`
  (o build falha se forem importados por código de cliente).
- O endpoint de cron exige `CRON_SECRET` (comparação em tempo constante) e
  fica fechado se a variável não estiver definida.
- `/auth/confirm` só redireciona para caminhos relativos (sem open redirect).
