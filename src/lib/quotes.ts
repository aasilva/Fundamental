import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { alphaVantageProvider } from "@/lib/quote-providers/alpha-vantage";
import { finnhubProvider } from "@/lib/quote-providers/finnhub";
import { aiWebSearchProvider } from "@/lib/quote-providers/ai-web-search";
import type { QuoteRequest, QuoteSource } from "@/lib/quote-providers/types";
import { runProviderChain, shouldRefresh, type RefreshPolicy } from "@/lib/quote-cache-policy";

// Ordem = prioridade. A pesquisa AI é o último recurso (mais lenta e com custo por pedido).
const PROVIDERS = [alphaVantageProvider, finnhubProvider, aiWebSearchProvider];

// Tempo durante o qual um ticker fica reservado para quem o está a atualizar.
// Igual ao maxDuration das rotas: se o pedido morrer a meio, o ticker fica livre depois disto.
const CLAIM_SECONDS = 300;

type Admin = ReturnType<typeof createAdminClient>;
type HoldingRef = { ticker: string; name: string | null; currency: string };

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
  // Tickers desatualizados que estão a ser atualizados (por este ou outro pedido).
  refreshing: string[];
  // Tickers efetivamente atualizados por esta chamada (só no modo "wait").
  refreshed: string[];
};

export type GetQuotesOptions = {
  policy: RefreshPolicy;
  // background: devolve já a cache e atualiza depois da resposta ser enviada (dashboard).
  // wait: espera pela atualização (botão "Atualizar cotações", email diário).
  mode: "background" | "wait";
};

async function readState(admin: Admin, tickers: string[]) {
  const [{ data: cachedRows }, { data: failureRows }] = await Promise.all([
    admin.from("quotes_cache").select("*").in("ticker", tickers),
    admin.from("quote_lookup_failures").select("*").in("ticker", tickers),
  ]);
  return {
    cache: new Map((cachedRows ?? []).map((row) => [row.ticker, row])),
    failures: new Map((failureRows ?? []).map((row) => [row.ticker, row])),
  };
}

async function refreshTicker(admin: Admin, request: QuoteRequest) {
  const result = await runProviderChain(request, PROVIDERS);
  const now = new Date().toISOString();

  if (result.ok) {
    await admin.from("quotes_cache").upsert(
      {
        ticker: request.ticker,
        price: result.price,
        previous_close: result.previousClose,
        currency: request.currency,
        source: result.source,
        source_url: result.sourceUrl,
        fetched_at: now,
      },
      { onConflict: "ticker" },
    );
    await admin.from("quote_lookup_failures").delete().eq("ticker", request.ticker);
  } else {
    await admin.from("quote_lookup_failures").upsert(
      {
        ticker: request.ticker,
        reason: result.reason,
        detail: result.detail.slice(0, 1000),
        failed_at: now,
      },
      { onConflict: "ticker" },
    );
  }
}

async function refreshTickers(admin: Admin, requests: QuoteRequest[]) {
  await Promise.allSettled(requests.map((request) => refreshTicker(admin, request)));
  await admin
    .from("quote_refresh_claims")
    .delete()
    .in(
      "ticker",
      requests.map((r) => r.ticker),
    );
}

export async function getQuotes(
  holdings: HoldingRef[],
  { policy, mode }: GetQuotesOptions,
): Promise<QuotesResult> {
  const byTicker = new Map<string, HoldingRef>();
  for (const h of holdings) {
    if (!byTicker.has(h.ticker)) byTicker.set(h.ticker, h);
  }
  const tickers = [...byTicker.keys()];
  if (tickers.length === 0) return { quotes: {}, failures: {}, refreshing: [], refreshed: [] };

  const admin = createAdminClient();
  let state = await readState(admin, tickers);

  const now = Date.now();
  const stale = tickers.filter((t) => shouldRefresh(state.cache.get(t), state.failures.get(t), now, policy));

  let claimed: string[] = [];
  if (stale.length > 0) {
    const { data, error } = await admin.rpc("claim_quote_refresh", {
      p_tickers: stale,
      p_claim_seconds: CLAIM_SECONDS,
    });
    if (error) console.error("claim_quote_refresh falhou:", error.message);
    claimed = data ?? [];
  }

  const requests: QuoteRequest[] = claimed.map((ticker) => ({
    ...byTicker.get(ticker)!,
    lastKnownPrice: state.cache.get(ticker)?.price ?? null,
  }));

  let refreshing = stale;
  let refreshed: string[] = [];

  if (requests.length > 0) {
    if (mode === "background") {
      after(() => refreshTickers(admin, requests));
    } else {
      await refreshTickers(admin, requests);
      state = await readState(admin, tickers);
      refreshed = claimed;
      refreshing = stale.filter((t) => !claimed.includes(t));
    }
  }

  const result: QuotesResult = { quotes: {}, failures: {}, refreshing, refreshed };
  for (const ticker of tickers) {
    const row = state.cache.get(ticker);
    if (row) {
      result.quotes[ticker] = {
        price: row.price,
        previousClose: row.previous_close,
        fetchedAt: row.fetched_at,
        source: row.source as QuoteSource,
        sourceUrl: row.source_url,
      };
    }
    const failure = state.failures.get(ticker);
    if (failure) {
      result.failures[ticker] = {
        reason: failure.reason as QuoteFailure["reason"],
        detail: failure.detail,
      };
    }
  }
  return result;
}
