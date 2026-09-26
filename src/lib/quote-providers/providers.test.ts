import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { alphaVantageProvider } from "./alpha-vantage";
import { finnhubProvider } from "./finnhub";
import { validateReportedQuote, type ReportedQuote } from "./ai-web-search";

const request = { ticker: "EDP", name: "EDP", currency: "EUR", lastKnownPrice: null };
const realFetch = globalThis.fetch;

function mockFetch(status: number, body: unknown) {
  globalThis.fetch = (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("alphaVantageProvider", () => {
  process.env.ALPHA_VANTAGE_API_KEY = "test";

  it("parses a quote", async () => {
    mockFetch(200, { "Global Quote": { "05. price": "4.2100", "08. previous close": "4.1000" } });
    assert.deepEqual(await alphaVantageProvider.fetchQuote(request), {
      ok: true, price: 4.21, previousClose: 4.1, source: "alpha_vantage", sourceUrl: null,
    });
  });

  it("treats the rate-limit notice as unavailable, not as an unknown ticker", async () => {
    mockFetch(200, { Information: "Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day." });
    const result = await alphaVantageProvider.fetchQuote(request);
    assert.equal(!result.ok && result.reason, "unavailable");
  });

  it("treats an empty quote as not_found", async () => {
    mockFetch(200, { "Global Quote": {} });
    const result = await alphaVantageProvider.fetchQuote(request);
    assert.equal(!result.ok && result.reason, "not_found");
  });
});

describe("finnhubProvider", () => {
  process.env.FINNHUB_API_KEY = "test";

  it("parses a quote", async () => {
    mockFetch(200, { c: 190.5, pc: 188, t: 1 });
    const result = await finnhubProvider.fetchQuote(request);
    assert.equal(result.ok && result.price, 190.5);
  });

  it("treats all-zero responses and 403 as not_found, 429 as unavailable", async () => {
    mockFetch(200, { c: 0, pc: 0, t: 0 });
    assert.equal((await finnhubProvider.fetchQuote(request)).ok, false);
    mockFetch(403, { error: "no access" });
    const forbidden = await finnhubProvider.fetchQuote(request);
    assert.equal(!forbidden.ok && forbidden.reason, "not_found");
    mockFetch(429, { error: "limit" });
    const limited = await finnhubProvider.fetchQuote(request);
    assert.equal(!limited.ok && limited.reason, "unavailable");
  });
});

describe("validateReportedQuote", () => {
  const NOW = Date.parse("2026-09-26T12:00:00Z");
  const hosts = new Set(["euronext.com"]);
  const good: ReportedQuote = {
    found: true,
    price: 4.21,
    currency: "EUR",
    as_of: "2026-09-25T16:35:00Z",
    source_url: "https://www.euronext.com/en/quote/EDP",
    exchange: "Euronext Lisbon",
  };
  const reason = (r: ReturnType<typeof validateReportedQuote>) => (r.ok ? "ok" : r.detail);

  it("accepts a quote backed by a search result", () => {
    const result = validateReportedQuote(good, request, hosts, NOW);
    assert.equal(result.ok && result.sourceUrl, good.source_url);
  });

  it("rejects a source URL that was not in the search results", () => {
    assert.match(reason(validateReportedQuote({ ...good, source_url: "https://invented.example/q" }, request, hosts, NOW)), /fonte/);
  });

  it("rejects a different currency", () => {
    assert.match(reason(validateReportedQuote({ ...good, currency: "USD" }, request, hosts, NOW)), /moeda/);
  });

  it("rejects stale or undated quotes", () => {
    assert.match(reason(validateReportedQuote({ ...good, as_of: "2026-08-01" }, request, hosts, NOW)), /desatualizada/);
    assert.match(reason(validateReportedQuote({ ...good, as_of: "ontem" }, request, hosts, NOW)), /desatualizada/);
  });

  it("rejects prices far from the last known price", () => {
    const withLast = { ...request, lastKnownPrice: 4 };
    assert.equal(validateReportedQuote(good, withLast, hosts, NOW).ok, true);
    assert.match(reason(validateReportedQuote({ ...good, price: 42.1 }, withLast, hosts, NOW)), /incoerente/);
  });

  it("rejects not-found and non-positive prices", () => {
    assert.equal(validateReportedQuote({ ...good, found: false, price: 0 }, request, hosts, NOW).ok, false);
    assert.equal(validateReportedQuote({ ...good, price: -1 }, request, hosts, NOW).ok, false);
  });
});
