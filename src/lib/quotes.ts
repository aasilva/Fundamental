import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { alphaVantageProvider } from "@/lib/quote-providers/alpha-vantage";
import { finnhubProvider } from "@/lib/quote-providers/finnhub";
import { aiWebSearchProvider } from "@/lib/quote-providers/ai-web-search";
import type { QuoteSource } from "@/lib/quote-providers/types";
import { runProviderChain, shouldRefresh } from "@/lib/quote-cache-policy";

// Ordem = prioridade. A pesquisa AI é o último recurso (mais lenta e com custo por pedido).
const PROVIDERS = [alphaVantageProvider, finnhubProvider, aiWebSearchProvider];

export type QuoteInfo = {
  price: number;
  previousClose: number | null;
  fetchedAt: string;
  source: QuoteSource;
  sourceUrl: string | null;
};

export type QuoteFailure = { reason: "not_found" | "unavailable"; detail: string | null };

export type QuotesResult = {
  quotes: Record<string, QuoteInfo>;
  failures: Record<string, QuoteFailure>;
};

export async function getQuotes(
  holdings: Array<{ ticker: string; name: string | null; currency: string }>,
): Promise<QuotesResult> {
  const byTicker = new Map<string, { ticker: string; name: string | null; currency: string }>();
  for (const h of holdings) {
    if (!byTicker.has(h.ticker)) byTicker.set(h.ticker, h);
  }
  const tickers = [...byTicker.keys()];
  if (tickers.length === 0) return { quotes: {}, failures: {} };

  const admin = createAdminClient();
  const [{ data: cachedRows }, { data: failureRows }] = await Promise.all([
    admin.from("quotes_cache").select("*").in("ticker", tickers),
    admin.from("quote_lookup_failures").select("*").in("ticker", tickers),
  ]);

  const cache = new Map((cachedRows ?? []).map((row) => [row.ticker, row]));
  const failures = new Map((failureRows ?? []).map((row) => [row.ticker, row]));
  const now = Date.now();

  const toRefresh = tickers.filter((t) => shouldRefresh(cache.get(t), failures.get(t), now));

  await Promise.all(
    toRefresh.map(async (ticker) => {
      const holding = byTicker.get(ticker)!;
      const result = await runProviderChain(
        { ...holding, lastKnownPrice: cache.get(ticker)?.price ?? null },
        PROVIDERS,
      );

      if (result.ok) {
        const { data: row } = await admin
          .from("quotes_cache")
          .upsert(
            {
              ticker,
              price: result.price,
              previous_close: result.previousClose,
              currency: holding.currency,
              source: result.source,
              source_url: result.sourceUrl,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "ticker" },
          )
          .select("*")
          .single();
        if (row) cache.set(ticker, row);
        await admin.from("quote_lookup_failures").delete().eq("ticker", ticker);
        failures.delete(ticker);
      } else {
        const { data: row } = await admin
          .from("quote_lookup_failures")
          .upsert(
            {
              ticker,
              reason: result.reason,
              detail: result.detail.slice(0, 1000),
              failed_at: new Date().toISOString(),
            },
            { onConflict: "ticker" },
          )
          .select("*")
          .single();
        if (row) failures.set(ticker, row);
      }
    }),
  );

  const result: QuotesResult = { quotes: {}, failures: {} };
  for (const ticker of tickers) {
    const row = cache.get(ticker);
    if (row) {
      result.quotes[ticker] = {
        price: row.price,
        previousClose: row.previous_close,
        fetchedAt: row.fetched_at,
        source: row.source as QuoteSource,
        sourceUrl: row.source_url,
      };
    }
    const failure = failures.get(ticker);
    if (failure) {
      result.failures[ticker] = {
        reason: failure.reason as QuoteFailure["reason"],
        detail: failure.detail,
      };
    }
  }
  return result;
}
