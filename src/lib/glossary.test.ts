import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GLOSSARY, GLOSSARY_CATEGORIES, METRIC_GLOSSARY, termOfTheDay } from "./glossary";
import { METRIC_FIELDS } from "./analysis/tool-schema";

describe("GLOSSARY", () => {
  it("has unique ids and valid categories", () => {
    assert.equal(new Set(GLOSSARY.map((t) => t.id)).size, GLOSSARY.length);
    for (const term of GLOSSARY) {
      assert.ok(term.category in GLOSSARY_CATEGORIES, `${term.id}: categoria inválida`);
      assert.ok(term.en && term.pt && term.definition, `${term.id}: campos em falta`);
    }
  });

  it("links every analysis metric to an existing term", () => {
    const ids = new Set(GLOSSARY.map((t) => t.id));
    for (const metric of METRIC_FIELDS) {
      const id = METRIC_GLOSSARY[metric.key];
      assert.ok(id, `métrica ${metric.key} sem entrada no glossário`);
      assert.ok(ids.has(id), `métrica ${metric.key} aponta para ${id}, que não existe`);
    }
  });

  it("picks the same term of the day for the whole day", () => {
    const morning = termOfTheDay(new Date("2026-09-28T01:00:00Z"));
    const evening = termOfTheDay(new Date("2026-09-28T23:00:00Z"));
    const nextDay = termOfTheDay(new Date("2026-09-29T01:00:00Z"));
    assert.equal(morning.id, evening.id);
    assert.notEqual(morning.id, nextDay.id);
  });
});
