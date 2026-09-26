import type { Tables } from "@/lib/supabase/database.types";

export type Holding = Tables<"holdings">;

type Quote = { price: number; fetchedAt: string; source?: string; sourceUrl?: string | null };

export type HoldingWithPnl = Holding & {
  currentPrice: number | null;
  quoteFetchedAt: string | null;
  quoteSource: string | null;
  quoteSourceUrl: string | null;
  currentValue: number | null;
  costBasis: number;
  pnlAbs: number | null;
  pnlPct: number | null;
};

export type CurrencySummary = {
  currency: string;
  totalCost: number;
  totalValue: number;
  totalPnlAbs: number;
  totalPnlPct: number;
  missingQuotes: number;
};

export function computePnl(
  holding: Holding,
  quote: Quote | undefined,
): HoldingWithPnl {
  const costBasis = holding.quantity * holding.entry_price;
  const currentPrice = quote?.price ?? null;
  const currentValue = currentPrice !== null ? holding.quantity * currentPrice : null;
  const pnlAbs = currentValue !== null ? currentValue - costBasis : null;
  const pnlPct = pnlAbs !== null && costBasis > 0 ? (pnlAbs / costBasis) * 100 : null;

  return {
    ...holding,
    currentPrice,
    quoteFetchedAt: quote?.fetchedAt ?? null,
    quoteSource: quote?.source ?? null,
    quoteSourceUrl: quote?.sourceUrl ?? null,
    currentValue,
    costBasis,
    pnlAbs,
    pnlPct,
  };
}

/**
 * Totais agrupados por moeda: somar USD com EUR sem câmbio daria um número sem significado.
 * Posições sem cotação entram ao preço de custo (P&L 0) e são contadas em missingQuotes.
 */
export function summarizeByCurrency(holdings: HoldingWithPnl[]): CurrencySummary[] {
  const byCurrency = new Map<string, CurrencySummary>();

  for (const h of holdings) {
    const summary = byCurrency.get(h.currency) ?? {
      currency: h.currency,
      totalCost: 0,
      totalValue: 0,
      totalPnlAbs: 0,
      totalPnlPct: 0,
      missingQuotes: 0,
    };
    summary.totalCost += h.costBasis;
    summary.totalValue += h.currentValue ?? h.costBasis;
    if (h.currentValue === null) summary.missingQuotes += 1;
    byCurrency.set(h.currency, summary);
  }

  return [...byCurrency.values()].map((s) => {
    const totalPnlAbs = s.totalValue - s.totalCost;
    return {
      ...s,
      totalPnlAbs,
      totalPnlPct: s.totalCost > 0 ? (totalPnlAbs / s.totalCost) * 100 : 0,
    };
  });
}
