import { METRIC_FIELDS, SECTION_FIELDS, type AnalysisMetrics, type AnalysisSections, type MetricUnit } from "./tool-schema";

export function buildMarkdownReport(sections: AnalysisSections, metrics: AnalysisMetrics): string {
  const parts: string[] = [];

  if (sections.resumo_executivo) {
    parts.push(`## Resumo\n\n${sections.resumo_executivo}`);
  }
  if (sections.evolucao_desde_ultima_analise) {
    parts.push(`## Evolução desde a última análise\n\n${sections.evolucao_desde_ultima_analise}`);
  }
  for (const { key, title } of SECTION_FIELDS) {
    const body = sections[key];
    if (body) parts.push(`## ${title}\n\n${body}`);
  }
  void metrics;
  return parts.join("\n\n");
}

export function formatMetricValue(value: number | null, unit: MetricUnit, currency: string | null): string {
  if (value === null || !Number.isFinite(value)) return "—";

  switch (unit) {
    case "pct":
      return `${value.toFixed(1)}%`;
    case "ratio":
      return `${value.toFixed(1)}x`;
    case "currency":
      return currency
        ? new Intl.NumberFormat("pt-PT", { style: "currency", currency, maximumFractionDigits: 2 }).format(value)
        : value.toLocaleString("pt-PT", { maximumFractionDigits: 2 });
    case "currency_large":
      return currency
        ? new Intl.NumberFormat("pt-PT", {
            style: "currency",
            currency,
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(value)
        : new Intl.NumberFormat("pt-PT", { notation: "compact", maximumFractionDigits: 1 }).format(value);
    case "number_large":
      return new Intl.NumberFormat("pt-PT", { notation: "compact", maximumFractionDigits: 1 }).format(value);
    default:
      return String(value);
  }
}

export { METRIC_FIELDS, SECTION_FIELDS };
