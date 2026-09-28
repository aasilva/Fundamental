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
- **Análise fundamental profunda de ações** (ticker, nome ou ISIN) por um agente com pesquisa web,
  guardada e comparada automaticamente com análises anteriores à mesma empresa
- Row Level Security: cada utilizador só vê e edita as suas próprias posições/análises

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
- **Cache e atualização**:
  - O dashboard **nunca espera pelas APIs**: mostra sempre o último valor guardado
    em `quotes_cache`. Se uma cotação tiver mais do que o intervalo escolhido pelo
    utilizador em **Definições** (5–1440 min, default 60), é atualizada em segundo
    plano depois de a página ser enviada, e a página recarrega sozinha quando termina.
  - Cotações obtidas por AI só são atualizadas automaticamente a cada
    `QUOTE_AI_CACHE_TTL_MINUTES` (360) no mínimo, por causa do custo.
  - O botão **"Atualizar cotações"** força a atualização de tudo o que tenha mais
    de 5 minutos (cliques repetidos não gastam pedidos).
  - Falhas também ficam em cache (`quote_lookup_failures`): um ticker que nenhum
    fornecedor encontrou só é pesquisado de novo automaticamente ao fim de
    `QUOTE_NOT_FOUND_RETRY_HOURS` (24); falhas temporárias ao fim de
    `QUOTE_UNAVAILABLE_RETRY_MINUTES` (60).
  - Um ticker só é atualizado por um pedido de cada vez (`claim_quote_refresh`),
    para dois separadores abertos não pagarem a mesma pesquisa duas vezes.

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

### 3.1 Análise fundamental de ações (agente com pesquisa web)

Em `/analysis`, pedes uma análise profunda de uma ação (ticker, nome e/ou
ISIN); um agente Claude com pesquisa web produz um relatório em 17 secções
(apresentação, estrutura acionista, EBITDA/EV-EBITDA, PER, margens, ROIC/ROCE,
dívida, dividendos, riscos, concorrência, tese de investimento, conclusão,
etc.) e guarda-o. Ao pedires uma nova análise à mesma empresa, as anteriores
são dadas ao agente como contexto, e ele descreve explicitamente o que mudou.

- **Requer** `ANTHROPIC_API_KEY` (a mesma da pesquisa AI de cotações, acima).
  Sem ela configurada, o formulário em `/analysis` continua visível mas as
  análises pedidas ficam em erro.
- **Demora minutos, não segundos.** O agente pesquisa extensivamente antes de
  escrever cada secção. Corre em segundo plano (o mesmo mecanismo `after()` já
  usado nas cotações): podes fechar a página e voltar depois — o progresso é
  guardado e retomado, mesmo que uma análise demore mais do que o limite de
  execução de uma única invocação (`ANALYSIS_TIME_BUDGET_MS`, por defeito
  ~260s, com margem face ao `maxDuration` de 300s da rota). Só uma análise de
  cada vez por utilizador (protege contra custos acidentais).
- **Custo**: bastante mais caro do que uma cotação — dezenas de pesquisas
  (`ANALYSIS_MAX_SEARCHES`, 40 por defeito, a $10/1.000) mais um relatório
  longo em tokens de saída. Conta uns **poucos dólares por análise** com
  `claude-opus-5` a effort `high`. Ajusta `ANALYSIS_EFFORT` (`low` a `max`) e
  `ANALYSIS_MAX_SEARCHES` para controlar profundidade vs. custo, e define um
  limite de gastos em console.anthropic.com → Limits.
- **Fiabilidade**: o agente é instruído a nunca inventar números — quando não
  encontra ou não consegue calcular uma métrica, fica `null` (mostrado como
  "—"), e o texto explica porquê. Mesmo assim, é conteúdo gerado por IA a
  partir de pesquisa web: confirma sempre números críticos nas fontes listadas
  no relatório antes de decidir.
- Como nas cotações, usa `fallbacks: "default"` (se o modelo recusar, a API
  tenta outro automaticamente) e uma reserva atómica (`claim_analysis`) para
  que dois separadores abertos não paguem a mesma análise duas vezes.

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

Testes unitários (cache de cotações, cadeia de fornecedores, validação AI, cálculos, formatação das análises):

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

## Editar o código tu mesmo

O código está no GitHub em `aasilva/Fundamental`, branch
`claude/stock-tracking-app-iieq9k`. Qualquer push para esse branch faz um novo
deploy na Vercel automaticamente.

- **No browser, sem instalar nada** (ideal para alterações pequenas): abre o
  repositório no GitHub, escolhe o branch acima e carrega na tecla **`.`**
  para abrir o editor (VS Code no browser, github.dev). Edita, e no painel
  *Source Control* faz *Commit & Push*. Para um único ficheiro, também podes usar
  o ícone do lápis na página do ficheiro.
- **No teu computador** (para testar antes de publicar):

  ```bash
  git clone https://github.com/aasilva/Fundamental.git
  cd Fundamental
  git checkout claude/stock-tracking-app-iieq9k
  npm install
  cp .env.example .env.local   # preencher as chaves
  npm run dev                  # http://localhost:3000
  npm test && npm run lint     # antes de fazer push
  ```

Onde mexer nas alterações mais comuns:

| Quero mudar… | Ficheiro |
|---|---|
| Textos, colunas e layout do dashboard | `src/app/page.tsx` |
| Campos do formulário de ações | `src/app/holdings/holding-form.tsx` + validação em `src/app/holdings/actions.ts` |
| Moedas disponíveis | `SUPPORTED_CURRENCIES` em `src/lib/format.ts` |
| Página de definições | `src/app/settings/page.tsx` + `actions.ts` |
| Email diário (aspeto) | `src/lib/email/daily-summary.ts` |
| Hora do email diário | `vercel.json` (cron em UTC) |
| Piso do botão "Atualizar" (5 min) | `MANUAL_REFRESH_FLOOR_MINUTES` em `src/lib/quote-cache-policy.ts` |
| Instruções dadas à pesquisa AI (cotações) | `SYSTEM_PROMPT` em `src/lib/quote-providers/ai-web-search.ts` |
| Persona/instruções do agente de análise, secções do relatório | `src/lib/analysis/prompt.ts` e `tool-schema.ts` |
| Métricas mostradas na comparação entre análises | `METRIC_FIELDS` em `src/lib/analysis/tool-schema.ts` |
| Profundidade/custo da análise (nº de pesquisas, effort) | variáveis `ANALYSIS_*` no `.env` |
| Cores / estilos | classes Tailwind diretamente nos componentes |

Alterações à **base de dados** (novas colunas/tabelas) precisam de SQL no
Supabase (SQL Editor) e de um novo ficheiro em `supabase/migrations/`, e o
`src/lib/supabase/database.types.ts` tem de ser atualizado. Para essas, é mais
seguro pedires-me.

Se voltares a pedir-me alterações depois de editares, eu começo sempre por ir
buscar a versão mais recente do branch, por isso as tuas mudanças não se perdem.

## Estrutura do projeto

```
src/
  app/
    login/, signup/           páginas + server actions de autenticação
    auth/confirm/             confirmação de email (PKCE code ou token_hash)
    holdings/                 CRUD de posições (novo, editar, eliminar)
    settings/                 definições (intervalo das cotações, notificações)
    quotes/actions.ts         botão "Atualizar cotações"
    analysis/                 lista+form, [id] relatório, company/[key] comparação
    api/cron/daily-summary/   endpoint chamado pelo cron
    page.tsx, loading.tsx     dashboard (lista + totais por moeda)
  components/                 botões com estado pendente / confirmação, pollers
  lib/
    supabase/                 clientes Supabase (browser, server, admin, sessão)
    quote-providers/          Alpha Vantage, Finnhub e pesquisa AI (mesma interface)
    quote-cache-policy.ts     quando refrescar + cadeia de fornecedores (testado)
    quotes.ts                 cache de cotações e de falhas na base de dados
    analysis/                 agente de análise fundamental (runner, prompt, schema, formatação)
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
- Em `stock_analyses`, o utilizador só pode criar/ler/apagar as suas análises;
  o estado e o conteúdo só são escritos pelo `service_role` (o agente), nunca
  diretamente pelo utilizador.
- O relatório da análise é renderizado com `react-markdown` (sem
  `dangerouslySetInnerHTML`), porque o texto vem de pesquisa web e uma página
  maliciosa poderia tentar injetar marcação.
