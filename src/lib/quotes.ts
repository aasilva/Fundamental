import { createAdminClient } from "@/lib/supabase/admin";
import { fetchQuoteFromAlphaVantage } from "@/lib/alpha-vantage";

const CACHE_TTL_MINUTES = Number(process.env.QUOTE_CACHE_TTL_MINUTES ?? 60);

export type QuoteMap = Record<string, { price: number; previousClose: number; fetchedAt: string }>;

export async function getQuotesForTickers(tickers: string[]): Promise<QuoteMap> {
  const uniqueTickers = [...new Set(tickers)];
  if (uniqueTickers.length === 0) return {};

  const admin = createAdminClient();

  const { data: cached } = await admin
    .from("quotes_cache")
    .select("ticker, price, previous_close, fetched_at")
    .in("ticker", uniqueTickers);

  const cacheByTicker = new Map((cached ?? []).map((row) => [row.ticker, row]));
  const staleCutoff = Date.now() - CACHE_TTL_MINUTES * 60 * 1000;

  const staleTickers = uniqueTickers.filter((ticker) => {
    const row = cacheByTicker.get(ticker);
    if (!row) return true;
    return new Date(row.fetched_at).getTime() < staleCutoff;
  });

  if (staleTickers.length > 0) {
    const freshResults = await Promise.all(
      staleTickers.map(async (ticker) => {
        try {
          const quote = await fetchQuoteFromAlphaVantage(ticker);
          return quote ? { ticker, ...quote } : null;
        } catch {
          return null;
        }
      }),
    );

    const rowsToUpsert = freshResults.filter((r): r is { ticker: string; price: number; previousClose: number } => r !== null);

    if (rowsToUpsert.length > 0) {
      const { data: upserted } = await admin
        .from("quotes_cache")
        .upsert(
          rowsToUpsert.map((r) => ({
            ticker: r.ticker,
            price: r.price,
            previous_close: r.previousClose,
            fetched_at: new Date().toISOString(),
          })),
          { onConflict: "ticker" },
        )
        .select("ticker, price, previous_close, fetched_at");

      for (const row of upserted ?? []) {
        cacheByTicker.set(row.ticker, row);
      }
    }
  }

  const result: QuoteMap = {};
  for (const ticker of uniqueTickers) {
    const row = cacheByTicker.get(ticker);
    if (row) {
      result[ticker] = {
        price: row.price,
        previousClose: row.previous_close ?? row.price,
        fetchedAt: row.fetched_at,
      };
    }
  }
  return result;
}
