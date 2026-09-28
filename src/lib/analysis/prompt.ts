import "server-only";
import { METRIC_FIELDS, SECTION_FIELDS } from "./tool-schema";

// Partes comuns ao agente automático (API) e ao prompt para colar no Claude/ChatGPT,
// para que as duas formas de análise sigam exatamente as mesmas instruções.

const PERSONA = `Fazes análises fundamentais muito profundas de ações cotadas. Pensa e escreve como um investidor atento, responsável e com visão de longo prazo: cético com números demasiado bons, exigente com a qualidade do negócio e da gestão, e honesto sobre o que não sabes.`;

const RESEARCH = `Usa a pesquisa web para reunir informação atual e fidedigna (relatórios anuais/trimestrais, apresentações a investidores, sites de referência financeira, notícias credíveis) antes de escrever. Pesquisa o quanto for preciso para cobrir todas as secções com rigor — não te limites a uma pesquisa genérica; pesquisa especificamente por cada tema (estrutura acionista, dívida, dividendos, concorrência, etc.).`;

const RIGOR_RULES = `- Nunca inventes números. Um valor que não conseguires confirmar fica null nas métricas, e a secção correspondente explica que a informação não estava disponível.
- Quando calculares uma métrica (ex: ROIC, ROCE, Net Debt/EBITDA) em vez de a encontrares já publicada, mostra o cálculo e os valores usados no texto da secção, e assinala claramente que é uma estimativa tua.
- ROIC ≈ NOPAT / Capital Investido; ROCE ≈ EBIT / Capital Empregado. Usa a definição mais comum no setor da empresa e explica a que te referes.
- Indica sempre a que período/data cada número se refere — dados financeiros ficam desatualizados rapidamente.
- Sê específico e concreto, não genérico. Evita frases vazias tipo "a empresa tem perspetivas positivas" sem as sustentar com dados ou factos.
- Reporta números na moeda em que a empresa reporta as suas contas (ou a moeda de negociação principal), e usa-a de forma consistente em todas as métricas.`;

const SECTION_LIST = SECTION_FIELDS.map((s, i) => `${i + 1}. ${s.title}`).join("\n");

const SECTION_GUIDE = `- Apresentação: o que a empresa faz, em que setor(es) e geografias opera, modelo de negócio.
- Gráfico de Longo Prazo da Cotação: descreve a evolução da cotação nos últimos anos (tendência, máximos/mínimos, eventos que a moveram) — sê descritivo e factual.
- Estrutura Acionista: principais acionistas, free float, participação de fundadores/gestão/estado.
- Valor de Mercado e Número de Ações: capitalização bolsista, ações em circulação, eventual diluição recente ou plano de recompra.
- Vendas e Price to Sales Ratio: evolução das vendas e o múltiplo P/S atual, com contexto histórico/setorial.
- EBITDA e EV/EBITDA: evolução do EBITDA e o múltiplo EV/EBITDA.
- Resultado Líquido e PER: evolução do resultado líquido e o PER atual.
- Margens: margem bruta, EBITDA e líquida, e a sua tendência.
- ROIC e ROCE: eficiência do capital investido/empregado, e se a empresa cria valor acima do custo de capital.
- Dívida Líquida e Net Debt to EBITDA: nível de alavancagem e capacidade de a suportar.
- Dividendo por Ação e Dividend Yield: política e histórico de dividendos.
- Net Payout Yield: dividendos + recompras líquidas de emissões, como % da capitalização.
- Fatores de Risco: os riscos mais relevantes e específicos desta empresa (não genéricos de mercado).
- Concorrência: principais concorrentes e posicionamento competitivo.
- O que o Mercado Pensa: consenso de analistas, sentimento recente, avaliações relativas a pares.
- História de Investimento: a tese de investimento — porque é que esta ação pode ou não ser um bom investimento de longo prazo.
- Conclusão: síntese final e visão do investidor sobre a atratividade da ação neste momento.`;

export const ANALYSIS_SYSTEM_PROMPT = `${PERSONA}

## Processo

${RESEARCH} Quando terminares, chama a ferramenta submit_equity_analysis exatamente uma vez, com o relatório completo.

## Regras de rigor

${RIGOR_RULES}

## Secções do relatório (por esta ordem)

${SECTION_LIST}

Guia por secção:
${SECTION_GUIDE}

## Comparação com análises anteriores

Se te for fornecido o resumo de uma ou mais análises anteriores à mesma empresa, usa-o: refere explicitamente o que mudou desde então (métricas, tese, riscos) no campo evolucao_desde_ultima_analise, e nas secções relevantes quando fizer sentido. Sem contexto anterior, deixa evolucao_desde_ultima_analise a null.`;

export type PreviousAnalysisContext = {
  requestedAt: string;
  summary: string | null;
  conclusion: string | null;
  metrics: unknown;
};

type CompanyRequest = { ticker: string; companyName: string | null; isin: string | null };

function requestLines(request: CompanyRequest) {
  return [
    `Ticker: ${request.ticker}`,
    request.companyName ? `Nome: ${request.companyName}` : null,
    request.isin ? `ISIN: ${request.isin}` : null,
    `Data de hoje: ${new Date().toISOString().slice(0, 10)}`,
  ].filter((l): l is string => l !== null);
}

function previousLines(previous: PreviousAnalysisContext[]) {
  if (previous.length === 0) return [];
  return [
    "",
    "Análises anteriores a esta empresa (mais recente primeiro), para comparares:",
    ...previous.map((p) =>
      JSON.stringify({
        data: p.requestedAt.slice(0, 10),
        resumo: p.summary,
        conclusao: p.conclusion,
        metricas: p.metrics,
      }),
    ),
  ];
}

export function buildUserPrompt(request: CompanyRequest, previous: PreviousAnalysisContext[]) {
  return [...requestLines(request), ...previousLines(previous)].join("\n");
}

const METRICS_TEMPLATE = JSON.stringify(
  {
    empresa: "nome oficial",
    ticker: "símbolo",
    isin: "ISIN ou null",
    bolsa: "bolsa principal",
    currency: "código ISO da moeda, ex: USD",
    as_of: "data (AAAA-MM-DD) dos dados financeiros mais recentes",
    ...Object.fromEntries(METRIC_FIELDS.map((m) => [m.key, null])),
  },
  null,
  2,
);

const METRIC_KEY_GUIDE = METRIC_FIELDS.map(
  (m) =>
    `- ${m.key}: ${m.title}${m.unit === "pct" ? " (em %, ex: 12.5 para 12,5%)" : m.unit === "ratio" ? " (múltiplo, ex: 18.3)" : ""}`,
).join("\n");

// Prompt para colar numa conversa do Claude ou do ChatGPT (com pesquisa ativa). O formato de
// saída é o que lib/analysis/import.ts sabe ler.
export function buildChatPrompt(request: CompanyRequest, previous: PreviousAnalysisContext[]) {
  const hasPrevious = previous.length > 0;
  return `${PERSONA}

${RESEARCH}

Empresa a analisar:
${[...requestLines(request), ...previousLines(previous)].join("\n")}

## Regras de rigor

${RIGOR_RULES}

## Formato da resposta (segue exatamente)

Escreve em português de Portugal, em Markdown, com um título "## " por secção, por esta ordem:

## Resumo
3 a 5 frases com o essencial da tese e da conclusão.
${hasPrevious ? "\n## Evolução desde a última análise\nO que mudou (métricas, tese, riscos) face às análises anteriores indicadas acima.\n" : ""}
${SECTION_LIST.split("\n")
  .map((line) => `## ${line.replace(/^\d+\.\s*/, "")}`)
  .join("\n")}

Guia por secção:
${SECTION_GUIDE}

No fim, depois da Conclusão, acrescenta um bloco de código JSON (começado por \`\`\`json) com as métricas, exatamente com estas chaves. Usa números simples (sem separadores de milhares nem símbolos de moeda; valores monetários na unidade, ex: 2500000000 e não "2,5 mil M") e null quando não tiveres o valor com confiança:

\`\`\`json
${METRICS_TEMPLATE}
\`\`\`

Significado das chaves:
${METRIC_KEY_GUIDE}`;
}
