import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatMetricValue, buildMarkdownReport } from "./format";
import { METRIC_FIELDS, SECTION_FIELDS, type AnalysisSections } from "./tool-schema";

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
  it("contains every section in order, but not the summary or evolution (shown separately)", () => {
    const sections = Object.fromEntries(SECTION_FIELDS.map((s) => [s.key, `texto de ${s.key}`])) as unknown as AnalysisSections;
    sections.resumo_executivo = "resumo curto";
    sections.evolucao_desde_ultima_analise = "mudou muito";

    const markdown = buildMarkdownReport(sections);

    assert.doesNotMatch(markdown, /resumo curto|mudou muito/);
    assert.ok(markdown.startsWith(`## ${SECTION_FIELDS[0].title}`));
    for (const { title, key } of SECTION_FIELDS) {
      assert.match(markdown, new RegExp(`## ${title}\\n\\ntexto de ${key}`));
    }
    const lastIndex = markdown.indexOf(`## ${SECTION_FIELDS.at(-1)!.title}`);
    assert.ok(lastIndex > 0);
  });
});
