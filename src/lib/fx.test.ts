import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseFrankfurterRates } from "./fx";

describe("parseFrankfurterRates", () => {
  it("inverts EUR-based rates into EUR per unit of each currency", () => {
    const rates = parseFrankfurterRates([
      { date: "2026-09-28", base: "EUR", quote: "USD", rate: 1.25 },
      { date: "2026-09-28", base: "EUR", quote: "GBP", rate: 0.8 },
    ]);
    assert.deepEqual(rates.get("USD"), { eurRate: 0.8, date: "2026-09-28" });
    assert.deepEqual(rates.get("GBP"), { eurRate: 1.25, date: "2026-09-28" });
  });

  it("ignores malformed entries, other bases and non-positive rates", () => {
    const rates = parseFrankfurterRates([
      { date: "2026-09-28", base: "USD", quote: "EUR", rate: 0.9 },
      { date: "2026-09-28", base: "EUR", quote: "JPY", rate: 0 },
      { date: "2026-09-28", base: "EUR", quote: "CHF", rate: "0.93" },
      null,
    ]);
    assert.equal(rates.size, 0);
  });

  it("returns an empty map for an unexpected payload", () => {
    assert.equal(parseFrankfurterRates({ error: "not found" }).size, 0);
  });
});
