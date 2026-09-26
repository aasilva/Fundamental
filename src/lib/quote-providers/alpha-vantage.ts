import "server-only";
import type { ProviderResult, QuoteProvider, QuoteRequest } from "./types";

// Tier gratuito: 5 pedidos/minuto, 25/dia.
async function fetchQuote({ ticker }: QuoteRequest): Promise<ProviderResult> {
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GLOBAL_QUOTE");
  url.searchParams.set("symbol", ticker);
  url.searchParams.set("apikey", process.env.ALPHA_VANTAGE_API_KEY!);

  let data: Record<string, unknown>;
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return { ok: false, reason: "unavailable", detail: `HTTP ${response.status}` };
    }
    data = await response.json();
  } catch (error) {
    return { ok: false, reason: "unavailable", detail: (error as Error).message };
  }

  // A Alpha Vantage responde 200 com "Note"/"Information" quando o limite de pedidos é atingido.
  if (data["Note"] || data["Information"]) {
    return { ok: false, reason: "unavailable", detail: "limite de pedidos atingido" };
  }

  const quote = data["Global Quote"] as Record<string, string> | undefined;
  const price = Number(quote?.["05. price"]);
  if (!quote || !Number.isFinite(price) || price <= 0) {
    return { ok: false, reason: "not_found", detail: "ticker desconhecido" };
  }

  const previousClose = Number(quote["08. previous close"]);
  return {
    ok: true,
    price,
    previousClose: Number.isFinite(previousClose) ? previousClose : null,
    source: "alpha_vantage",
    sourceUrl: null,
  };
}

export const alphaVantageProvider: QuoteProvider = {
  source: "alpha_vantage",
  isConfigured: () => Boolean(process.env.ALPHA_VANTAGE_API_KEY),
  fetchQuote,
};
