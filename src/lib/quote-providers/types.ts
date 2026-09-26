export type QuoteSource = "alpha_vantage" | "finnhub" | "ai_web_search";

export type QuoteRequest = {
  ticker: string;
  name: string | null;
  currency: string;
  // Última cotação conhecida, para detetar respostas absurdas da pesquisa AI.
  lastKnownPrice: number | null;
};

export type ProviderResult =
  | {
      ok: true;
      price: number;
      previousClose: number | null;
      source: QuoteSource;
      sourceUrl: string | null;
    }
  // not_found: o fornecedor respondeu mas não conhece o ticker.
  // unavailable: limite de pedidos, erro de rede, etc. — vale a pena tentar mais cedo.
  | { ok: false; reason: "not_found" | "unavailable"; detail: string };

export type QuoteProvider = {
  source: QuoteSource;
  isConfigured: () => boolean;
  fetchQuote: (request: QuoteRequest) => Promise<ProviderResult>;
};
