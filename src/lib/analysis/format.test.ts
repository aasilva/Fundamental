import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatMetricValue, buildMarkdownReport } from "./format";
import { METRIC_FIELDS, SECTION_FIELDS, type AnalysisMetrics, type AnalysisSections } from "./tool-schema";

describe("formatMetricValue", () => {
  it("returns an em dash for null or non-finite values", () => {
    assert.equal(formatMetricValue(null, "ratio", "EUR"), "—");
    assert.equal(formatMetricValue(Number.NaN, "pct", "EUR"), "—");
  });

  it("formats percentages and ratios without needing a currency", () => {
    assert.equal(formatMetricValue(12.3, "pct", null), "12.3%");
    assert.equal(formatMetricValue(8.2, "ratio", null), "8.2x");
  });

  it("formats currency values using the given ISO code", () => {
    const formatted = formatMetricValue(42.5, "currency", "EUR");
    assert.match(formatted, /42,5/);
    assert.match(formatted, /€/);
  });

  it("falls back to a plain number when no currency is known", () => {
    assert.doesNotMatch(formatMetricValue(1_000_000, "currency_large", null), /[€$]/);
  });
});

describe("SECTION_FIELDS / METRIC_FIELDS", () => {
  it("have unique keys", () => {
    assert.equal(new Set(SECTION_FIELDS.map((s) => s.key)).size, SECTION_FIELDS.length);
    assert.equal(new Set(METRIC_FIELDS.map((m) => m.key)).size, METRIC_FIELDS.length);
  });
});

describe("buildMarkdownReport", () => {
  const metrics: AnalysisMetrics = Object.fromEntries(
    METRIC_FIELDS.map((m) => [m.key, null]),
  ) as unknown as AnalysisMetrics;
  metrics.currency = "EUR";
  metrics.as_of = "2026-01-01";

  it("includes the summary and every non-empty section, in order, with a heading", () => {
    const sections = Object.fromEntries(SECTION_FIELDS.map((s) => [s.key, `texto de ${s.key}`])) as unknown as AnalysisSections;
    sections.resumo_executivo = "resumo curto";
    sections.evolucao_desde_ultima_analise = null;
    sections.company_name_resolved = "Empresa Teste";
    sections.ticker_resolved = "TST";
    sections.isin_resolved = null;
    sections.exchange = null;

    const markdown = buildMarkdownReport(sections, metrics);

    assert.match(markdown, /^## Resumo\n\nresumo curto/);
    assert.doesNotMatch(markdown, /Evolução desde a última análise/);
    for (const { title, key } of SECTION_FIELDS) {
      assert.match(markdown, new RegExp(`## ${title}\\n\\ntexto de ${key}`));
    }
    // As secções mantêm a ordem definida em SECTION_FIELDS.
    const firstIndex = markdown.indexOf(`## ${SECTION_FIELDS[0].title}`);
    const lastIndex = markdown.indexOf(`## ${SECTION_FIELDS.at(-1)!.title}`);
    assert.ok(firstIndex >= 0 && lastIndex > firstIndex);
  });

  it("includes the evolution box only when present", () => {
    const sections = Object.fromEntries(SECTION_FIELDS.map((s) => [s.key, "x"])) as unknown as AnalysisSections;
    sections.resumo_executivo = "resumo";
    sections.evolucao_desde_ultima_analise = "mudou muito";
    sections.company_name_resolved = null;
    sections.ticker_resolved = null;
    sections.isin_resolved = null;
    sections.exchange = null;

    const markdown = buildMarkdownReport(sections, metrics);
    assert.match(markdown, /## Evolução desde a última análise\n\nmudou muito/);
  });
});
