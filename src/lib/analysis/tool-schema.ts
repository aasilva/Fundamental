import "server-only";
import type Anthropic from "@anthropic-ai/sdk";

// Fonte única de verdade para as secções do relatório: usada para construir o schema da
// ferramenta, o Markdown final e a navegação da página de relatório.
export const SECTION_FIELDS = [
  { key: "apresentacao", title: "Apresentação" },
  { key: "grafico_longo_prazo", title: "Gráfico de Longo Prazo da Cotação" },
  { key: "estrutura_acionista", title: "Estrutura Acionista" },
  { key: "valor_mercado_acoes", title: "Valor de Mercado e Número de Ações" },
  { key: "vendas_price_to_sales", title: "Vendas e Price to Sales Ratio" },
  { key: "ebitda_ev_ebitda", title: "EBITDA e EV/EBITDA" },
  { key: "resultado_liquido_per", title: "Resultado Líquido e PER" },
  { key: "margens", title: "Margens" },
  { key: "roic_roce", title: "ROIC e ROCE" },
  { key: "divida_liquida_net_debt_ebitda", title: "Dívida Líquida e Net Debt to EBITDA" },
  { key: "dividendo_dividend_yield", title: "Dividendo por Ação e Dividend Yield" },
  { key: "net_payout_yield", title: "Net Payout Yield" },
  { key: "fatores_risco", title: "Fatores de Risco" },
  { key: "concorrencia", title: "Concorrência" },
  { key: "mercado_pensa", title: "O que o Mercado Pensa" },
  { key: "historia_investimento", title: "História de Investimento" },
  { key: "conclusao", title: "Conclusão" },
] as const;

export type SectionKey = (typeof SECTION_FIELDS)[number]["key"];

// unit orienta a formatação na tabela de comparação (ver lib/analysis/format.ts).
export const METRIC_FIELDS = [
  { key: "current_price", title: "Cotação", unit: "currency" },
  { key: "price_52w_low", title: "Mín. 52 semanas", unit: "currency" },
  { key: "price_52w_high", title: "Máx. 52 semanas", unit: "currency" },
  { key: "market_cap", title: "Valor de Mercado", unit: "currency_large" },
  { key: "shares_outstanding", title: "Nº de Ações", unit: "number_large" },
  { key: "revenue_ttm", title: "Vendas (últimos 12 meses)", unit: "currency_large" },
  { key: "price_to_sales", title: "Price to Sales", unit: "ratio" },
  { key: "ebitda", title: "EBITDA", unit: "currency_large" },
  { key: "ev_ebitda", title: "EV/EBITDA", unit: "ratio" },
  { key: "net_income", title: "Resultado Líquido", unit: "currency_large" },
  { key: "per", title: "PER", unit: "ratio" },
  { key: "gross_margin_pct", title: "Margem Bruta", unit: "pct" },
  { key: "ebitda_margin_pct", title: "Margem EBITDA", unit: "pct" },
  { key: "net_margin_pct", title: "Margem Líquida", unit: "pct" },
  { key: "roic_pct", title: "ROIC", unit: "pct" },
  { key: "roce_pct", title: "ROCE", unit: "pct" },
  { key: "net_debt", title: "Dívida Líquida", unit: "currency_large" },
  { key: "net_debt_to_ebitda", title: "Net Debt / EBITDA", unit: "ratio" },
  { key: "dividend_per_share", title: "Dividendo por Ação", unit: "currency" },
  { key: "dividend_yield_pct", title: "Dividend Yield", unit: "pct" },
  { key: "net_payout_yield_pct", title: "Net Payout Yield", unit: "pct" },
] as const;

export type MetricKey = (typeof METRIC_FIELDS)[number]["key"];
export type MetricUnit = (typeof METRIC_FIELDS)[number]["unit"];

export type AnalysisMetrics = Record<MetricKey, number | null> & {
  currency: string | null;
  as_of: string | null;
};

export type AnalysisSource = { title: string; url: string };

export type AnalysisSections = Record<SectionKey, string> & {
  resumo_executivo: string;
  evolucao_desde_ultima_analise: string | null;
  company_name_resolved: string | null;
  ticker_resolved: string | null;
  isin_resolved: string | null;
  exchange: string | null;
};

export type SubmittedAnalysis = {
  sections: AnalysisSections;
  metrics: AnalysisMetrics;
  sources: AnalysisSource[];
};

function nullableNumber(description: string) {
  return { type: ["number", "null"], description } as const;
}

function nullableString(description: string) {
  return { type: ["string", "null"], description } as const;
}

const sectionProperties = Object.fromEntries(
  SECTION_FIELDS.map(({ key, title }) => [
    key,
    { type: "string", description: `Secção "${title}", em Markdown (usa ## para o título, ### para subtítulos se precisares). Escreve várias frases com substância — nunca deixes vazio; se a informação não existir, explica porquê.` },
  ]),
);

const metricsSchema = {
  type: "object",
  description: "Métricas numéricas extraídas ou calculadas, para comparação entre análises. Usa null quando não foi possível apurar um valor com confiança — nunca inventes.",
  properties: {
    currency: nullableString("Código ISO 4217 da moeda de referência dos valores monetários (ex: EUR, USD)."),
    as_of: nullableString("Data (ISO 8601) a que os dados financeiros mais recentes usados se referem."),
    ...Object.fromEntries(
      METRIC_FIELDS.map(({ key, title, unit }) => [
        key,
        nullableNumber(
          `${title}${unit === "pct" ? " (percentagem, ex: 12.5 para 12,5%)" : unit === "currency_large" || unit === "currency" ? " (na moeda indicada em currency)" : ""}.`,
        ),
      ]),
    ),
  },
  required: ["currency", "as_of", ...METRIC_FIELDS.map((m) => m.key)],
  additionalProperties: false,
} as const;

const sourcesSchema = {
  type: "array",
  description: "Fontes efetivamente usadas na análise (das pesquisas realizadas), para o leitor poder verificar.",
  items: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título da página ou do documento." },
      url: { type: "string", description: "URL da fonte." },
    },
    required: ["title", "url"],
    additionalProperties: false,
  },
} as const;

const sectionsSchema = {
  type: "object",
  properties: {
    company_name_resolved: nullableString("Nome oficial da empresa identificada."),
    ticker_resolved: nullableString("Ticker/símbolo bolsista identificado (com sufixo de bolsa se aplicável)."),
    isin_resolved: nullableString("ISIN identificado, se encontrado."),
    exchange: nullableString("Bolsa principal onde a ação é negociada."),
    resumo_executivo: {
      type: "string",
      description: "3 a 5 frases: o essencial da tese de investimento e da conclusão, para leitura rápida numa lista.",
    },
    evolucao_desde_ultima_analise: nullableString(
      "Só quando te for fornecido o contexto de uma análise anterior à mesma empresa: o que mudou (métricas, tese, riscos) desde então, em Markdown. Caso contrário, null.",
    ),
    ...sectionProperties,
  },
  required: [
    "company_name_resolved",
    "ticker_resolved",
    "isin_resolved",
    "exchange",
    "resumo_executivo",
    "evolucao_desde_ultima_analise",
    ...SECTION_FIELDS.map((s) => s.key),
  ],
  additionalProperties: false,
} as const;

export const submitAnalysisTool: Anthropic.Beta.BetaTool = {
  name: "submit_equity_analysis",
  description:
    "Submete a análise fundamental completa da ação. Chama esta ferramenta exatamente uma vez, no final, depois de teres pesquisado o suficiente para preencher todas as secções com rigor.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      sections: sectionsSchema,
      metrics: metricsSchema,
      sources: sourcesSchema,
    },
    required: ["sections", "metrics", "sources"],
    additionalProperties: false,
  },
};
