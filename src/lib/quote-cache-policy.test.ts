import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { automaticPolicy, MANUAL_POLICY, runProviderChain, shouldRefresh } from "./quote-cache-policy";
import type { ProviderResult, QuoteProvider } from "./quote-providers/types";

const config = { ttlMinutes: 60, aiTtlMinutes: 360, notFoundRetryMinutes: 1440, unavailableRetryMinutes: 60 };
const NOW = Date.parse("2026-09-26T12:00:00Z");
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

describe("shouldRefresh", () => {
  it("refreshes a ticker with no cache and no failure", () => {
    assert.equal(shouldRefresh(undefined, undefined, NOW, config), true);
  });

  it("keeps a fresh quote and refreshes a stale one", () => {
    assert.equal(shouldRefresh({ source: "alpha_vantage", fetched_at: minutesAgo(30) }, undefined, NOW, config), false);
    assert.equal(shouldRefresh({ source: "alpha_vantage", fetched_at: minutesAgo(90) }, undefined, NOW, config), true);
  });

  it("keeps AI quotes for the longer AI TTL", () => {
    assert.equal(shouldRefresh({ source: "ai_web_search", fetched_at: minutesAgo(90) }, undefined, NOW, config), false);
    assert.equal(shouldRefresh({ source: "ai_web_search", fetched_at: minutesAgo(400) }, undefined, NOW, config), true);
  });

  it("does not retry a not_found ticker within the backoff window", () => {
    assert.equal(shouldRefresh(undefined, { reason: "not_found", failed_at: minutesAgo(600) }, NOW, config), false);
    assert.equal(shouldRefresh(undefined, { reason: "not_found", failed_at: minutesAgo(1500) }, NOW, config), true);
  });

  it("retries an unavailable ticker sooner", () => {
    assert.equal(shouldRefresh(undefined, { reason: "unavailable", failed_at: minutesAgo(30) }, NOW, config), false);
    assert.equal(shouldRefresh(undefined, { reason: "unavailable", failed_at: minutesAgo(90) }, NOW, config), true);
  });

  it("keeps showing a stale quote without refetching while a recent failure is recorded", () => {
    const stale = { source: "alpha_vantage", fetched_at: minutesAgo(300) };
    assert.equal(shouldRefresh(stale, { reason: "unavailable", failed_at: minutesAgo(10) }, NOW, config), false);
  });
});

describe("automaticPolicy", () => {
  it("uses the user's interval for normal quotes", () => {
    const policy = automaticPolicy(15);
    assert.equal(shouldRefresh({ source: "finnhub", fetched_at: minutesAgo(10) }, undefined, NOW, policy), false);
    assert.equal(shouldRefresh({ source: "finnhub", fetched_at: minutesAgo(20) }, undefined, NOW, policy), true);
  });

  it("never refreshes AI quotes automatically more often than the AI minimum", () => {
    const policy = automaticPolicy(15);
    assert.equal(policy.aiTtlMinutes, 360);
    assert.equal(shouldRefresh({ source: "ai_web_search", fetched_at: minutesAgo(120) }, undefined, NOW, policy), false);
  });

  it("respects a user interval longer than the AI minimum", () => {
    assert.equal(automaticPolicy(720).aiTtlMinutes, 720);
  });
});

describe("MANUAL_POLICY (refresh button)", () => {
  it("refreshes anything older than 5 minutes, including AI quotes and recorded failures", () => {
    assert.equal(shouldRefresh({ source: "ai_web_search", fetched_at: minutesAgo(6) }, undefined, NOW, MANUAL_POLICY), true);
    assert.equal(shouldRefresh(undefined, { reason: "not_found", failed_at: minutesAgo(6) }, NOW, MANUAL_POLICY), true);
  });

  it("ignores repeated clicks within 5 minutes", () => {
    assert.equal(shouldRefresh({ source: "alpha_vantage", fetched_at: minutesAgo(2) }, undefined, NOW, MANUAL_POLICY), false);
    assert.equal(shouldRefresh(undefined, { reason: "unavailable", failed_at: minutesAgo(2) }, NOW, MANUAL_POLICY), false);
  });
});

function provider(source: QuoteProvider["source"], result: ProviderResult | null, calls: string[]): QuoteProvider {
  return {
    source,
    isConfigured: () => result !== null,
    fetchQuote: async () => {
      calls.push(source);
      return result!;
    },
  };
}

const request = { ticker: "EDP", name: null, currency: "EUR", lastKnownPrice: null };
const ok = (source: QuoteProvider["source"]): ProviderResult => ({
  ok: true, price: 4.2, previousClose: null, source, sourceUrl: null,
});

describe("runProviderChain", () => {
  it("stops at the first provider that succeeds", async () => {
    const calls: string[] = [];
    const result = await runProviderChain(request, [
      provider("alpha_vantage", ok("alpha_vantage"), calls),
      provider("finnhub", ok("finnhub"), calls),
    ]);
    assert.equal(result.ok && result.source, "alpha_vantage");
    assert.deepEqual(calls, ["alpha_vantage"]);
  });

  it("falls through to the next provider on failure and skips unconfigured ones", async () => {
    const calls: string[] = [];
    const result = await runProviderChain(request, [
      provider("alpha_vantage", { ok: false, reason: "not_found", detail: "x" }, calls),
      provider("finnhub", null, calls),
      provider("ai_web_search", ok("ai_web_search"), calls),
    ]);
    assert.equal(result.ok && result.source, "ai_web_search");
    assert.deepEqual(calls, ["alpha_vantage", "ai_web_search"]);
  });

  it("reports not_found only when every provider said not_found", async () => {
    const result = await runProviderChain(request, [
      provider("alpha_vantage", { ok: false, reason: "not_found", detail: "a" }, []),
      provider("finnhub", { ok: false, reason: "not_found", detail: "b" }, []),
    ]);
    assert.deepEqual(result, { ok: false, reason: "not_found", detail: "alpha_vantage: a; finnhub: b" });
  });

  it("reports unavailable when any provider was rate limited", async () => {
    const result = await runProviderChain(request, [
      provider("alpha_vantage", { ok: false, reason: "unavailable", detail: "limit" }, []),
      provider("finnhub", { ok: false, reason: "not_found", detail: "b" }, []),
    ]);
    assert.equal(!result.ok && result.reason, "unavailable");
  });

  it("reports unavailable when no provider is configured", async () => {
    const result = await runProviderChain(request, [provider("alpha_vantage", null, [])]);
    assert.equal(!result.ok && result.reason, "unavailable");
  });
});
