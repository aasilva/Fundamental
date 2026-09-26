import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computePnl, summarizeByCurrency, type Holding } from "./calculations";

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
