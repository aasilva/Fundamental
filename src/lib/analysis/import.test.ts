import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseImportedAnalysis, toNumber } from "./import";
import { SECTION_FIELDS } from "./tool-schema";

const allSections = SECTION_FIELDS.map((s) => `## ${s.title}\n\nTexto sobre ${s.title}.`).join("\n\n");

const fullReport = `Aqui está a análise pedida.

## Resumo

A Amazon continua a crescer.

## Evolução desde a última análise

O PER desceu.

${allSections}

\`\`\`json
{
  "empresa": "Amazon.com, Inc.",
  "ticker": "AMZN",
  "isin": "US0231351067",
  "bolsa": "NASDAQ",
  "currency": "usd",
  "as_of": "2026-06-30",
  "per": 35.2,
  "roic_pct": "14,5",
  "market_cap": 2100000000000,
  "dividend_yield_pct": null
}
\`\`\``;

describe("toNumber", () => {
  it("accepts numbers and common text formats", () => {
    assert.equal(toNumber(12.5), 12.5);
    assert.equal(toNumber("12,5"), 12.5);
    assert.equal(toNumber("1.234,5"), 1234.5);
    assert.equal(toNumber("1,234.5"), 1234.5);
    assert.equal(toNumber("12.5%"), 12.5);
    assert.equal(toNumber("18.3x"), 18.3);
  });

  it("returns null for missing or non-numeric values", () => {
    assert.equal(toNumber(null), null);
    assert.equal(toNumber("n/a"), null);
    assert.equal(toNumber("—"), null);
    assert.equal(toNumber("muito"), null);
    assert.equal(toNumber(Number.POSITIVE_INFINITY), null);
  });
});

describe("parseImportedAnalysis", () => {
  it("splits summary, evolution, sections and metrics from a well-formed report", () => {
    const parsed = parseImportedAnalysis(fullReport);

    assert.equal(parsed.summary, "A Amazon continua a crescer.");
    assert.equal(parsed.evolution, "O PER desceu.");
    assert.equal(parsed.conclusion, "Texto sobre Conclusão.");
    assert.deepEqual(parsed.missingSections, []);
    assert.deepEqual(parsed.warnings, []);
    assert.doesNotMatch(parsed.markdown, /## Resumo|## Evolução|```/);
    assert.match(parsed.markdown, /## Conclusão/);

    assert.equal(parsed.metrics?.currency, "USD");
    assert.equal(parsed.metrics?.per, 35.2);
    assert.equal(parsed.metrics?.roic_pct, 14.5);
    assert.equal(parsed.metrics?.dividend_yield_pct, null);
    assert.equal(parsed.metrics?.ev_ebitda, null);
    assert.deepEqual(parsed.identity, {
      companyName: "Amazon.com, Inc.",
      ticker: "AMZN",
      isin: "US0231351067",
      exchange: "NASDAQ",
    });
  });

  it("handles Windows line endings and numbered headings", () => {
    const numbered = fullReport.replace(/## (?!Resumo|Evolução)/g, (_m, i: number) => `## ${i}. `);
    const parsed = parseImportedAnalysis(numbered.replace(/\n/g, "\r\n"));
    assert.deepEqual(parsed.missingSections, []);
    assert.equal(parsed.metrics?.per, 35.2);
  });

  it("keeps the report without metrics when there is no JSON block", () => {
    const parsed = parseImportedAnalysis(`## Resumo\n\nCurto.\n\n${allSections}`);
    assert.equal(parsed.metrics, null);
    assert.equal(parsed.summary, "Curto.");
    assert.match(parsed.warnings.join(" "), /Não encontrei o bloco JSON/);
  });

  it("reports an invalid JSON block instead of failing", () => {
    const parsed = parseImportedAnalysis(`${allSections}\n\n\`\`\`json\n{ "per": 12, }\n\`\`\``);
    assert.equal(parsed.metrics, null);
    assert.match(parsed.warnings.join(" "), /erro de formato/);
  });

  it("lists sections that are missing", () => {
    const parsed = parseImportedAnalysis("## Apresentação\n\nSó isto.");
    assert.ok(parsed.missingSections.includes("Conclusão"));
    assert.ok(!parsed.missingSections.includes("Apresentação"));
  });
});
