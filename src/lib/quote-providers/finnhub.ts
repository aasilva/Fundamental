import "server-only";
import type { ProviderResult, QuoteProvider, QuoteRequest } from "./types";

// Tier gratuito: 60 pedidos/minuto, mas só ações dos EUA.
async function fetchQuote({ ticker }: QuoteRequest): Promise<ProviderResult> {
  const url = new URL("https://finnhub.io/api/v1/quote");
  url.searchParams.set("symbol", ticker);

  let data: { c?: number; pc?: number; t?: number };
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "X-Finnhub-Token": process.env.FINNHUB_API_KEY! },
    });
    if (response.status === 429 || response.status >= 500) {
      return { ok: false, reason: "unavailable", detail: `HTTP ${response.status}` };
    }
    // 401/403: símbolo fora do plano (ex: bolsas não americanas no tier gratuito).
    if (!response.ok) {
      return { ok: false, reason: "not_found", detail: `HTTP ${response.status}` };
    }
    data = await response.json();
  } catch (error) {
    return { ok: false, reason: "unavailable", detail: (error as Error).message };
  }

  // Símbolo desconhecido devolve tudo a 0.
  if (!data.c || data.c <= 0) {
    return { ok: false, reason: "not_found", detail: "ticker desconhecido" };
  }

  return {
    ok: true,
    price: data.c,
    previousClose: data.pc && data.pc > 0 ? data.pc : null,
    source: "finnhub",
    sourceUrl: null,
  };
}

export const finnhubProvider: QuoteProvider = {
  source: "finnhub",
  isConfigured: () => Boolean(process.env.FINNHUB_API_KEY),
  fetchQuote,
};
