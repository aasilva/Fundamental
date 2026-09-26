export type AlphaVantageQuote = {
  price: number;
  previousClose: number;
};

/**
 * Alpha Vantage free tier: 5 pedidos/minuto, 25/dia. Ver README para detalhes
 * e alternativas caso a carteira tenha muitos tickers diferentes.
 */
export async function fetchQuoteFromAlphaVantage(
  ticker: string,
): Promise<AlphaVantageQuote | null> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("ALPHA_VANTAGE_API_KEY não está definida");
  }

  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "GLOBAL_QUOTE");
  url.searchParams.set("symbol", ticker);
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Alpha Vantage respondeu ${response.status} para ${ticker}`);
  }

  const data = await response.json();
  const quote = data["Global Quote"];
  const price = quote?.["05. price"];
  const previousClose = quote?.["08. previous close"];

  if (!price) {
    // Ticker inválido, ou limite de pedidos da API atingido
    return null;
  }

  return {
    price: Number(price),
    previousClose: Number(previousClose ?? price),
  };
}
