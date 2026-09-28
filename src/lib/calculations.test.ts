import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computePnl, summarizeByCurrency, summarizeInEur, historicalRateKey, type Holding } from "./calculations";

const base: Omit<Holding, "id" | "ticker" | "currency" | "quantity" | "entry_price"> = {
  created_at: "",
  updated_at: "",
  user_id: "u",
  name: null,
  notes: null,
  entry_date: "2024-01-01",
};

describe("summarizeByCurrency", () => {
  it("keeps currencies separate and values missing quotes at cost", () => {
    const holdings = [
      computePnl({ ...base, id: "1", ticker: "AAPL", currency: "USD", quantity: 10, entry_price: 100 }, { price: 150, fetchedAt: "x" }),
      computePnl({ ...base, id: "2", ticker: "MSFT", currency: "USD", quantity: 5, entry_price: 200 }, undefined),
      computePnl({ ...base, id: "3", ticker: "MBG.DEX", currency: "EUR", quantity: 4, entry_price: 50 }, { price: 40, fetchedAt: "x" }),
    ];

    assert.deepEqual(summarizeByCurrency(holdings), [
      { currency: "USD", totalCost: 2000, totalValue: 2500, totalPnlAbs: 500, totalPnlPct: 25, missingQuotes: 1 },
      { currency: "EUR", totalCost: 200, totalValue: 160, totalPnlAbs: -40, totalPnlPct: -20, missingQuotes: 0 },
    ]);
  });
});

describe("summarizeInEur", () => {
  // O dólar valia 0,75 € na compra e vale 0,5 € hoje (valores exatos em binário).
  const rates = {
    latest: { USD: 0.5 },
    historical: { [historicalRateKey("2024-01-01", "USD")]: 0.75 },
  };

  it("values at today's rate, costs at the purchase-date rate, and splits price vs FX effect", () => {
    const holdings = [
      computePnl({ ...base, id: "1", ticker: "AAPL", currency: "USD", quantity: 10, entry_price: 100 }, { price: 150, fetchedAt: "x" }),
      computePnl({ ...base, id: "2", ticker: "MSFT", currency: "USD", quantity: 5, entry_price: 200 }, undefined),
      computePnl({ ...base, id: "3", ticker: "MBG.DEX", currency: "EUR", quantity: 4, entry_price: 50 }, { price: 40, fetchedAt: "x" }),
    ];

    const summary = summarizeInEur(holdings, rates);

    // AAPL: valor 1500 $ × 0,5 = 750 €; custo 1000 $ × 0,75 = 750 €
    // MSFT (sem cotação, entra ao custo): valor 1000 $ × 0,5 = 500 €; custo 1000 $ × 0,75 = 750 €
    // MBG: valor 160 €; custo 200 €
    assert.equal(summary.totalValue, 1410);
    assert.equal(summary.totalCost, 1700);
    assert.equal(summary.totalPnlAbs, -290);
    assert.equal(summary.pricePnl, 210); // +250 (AAPL) − 40 (MBG)
    assert.equal(summary.fxPnl, -500); // −250 (AAPL) − 250 (MSFT)
    assert.equal(summary.pricePnl + summary.fxPnl, summary.totalPnlAbs);
    assert.deepEqual(summary.excluded, []);
  });

  it("excludes positions without an exchange rate instead of guessing", () => {
    const holdings = [
      computePnl({ ...base, id: "1", ticker: "TSCO.LON", currency: "GBP", quantity: 1, entry_price: 3 }, { price: 3, fetchedAt: "x" }),
      computePnl({ ...base, id: "2", ticker: "MBG.DEX", currency: "EUR", quantity: 1, entry_price: 50 }, { price: 50, fetchedAt: "x" }),
    ];

    const summary = summarizeInEur(holdings, rates);

    assert.deepEqual(summary.excluded, ["TSCO.LON"]);
    assert.equal(summary.totalValue, 50);
  });
});
