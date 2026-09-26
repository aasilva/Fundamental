import type { Tables } from "@/lib/supabase/database.types";

export type Holding = Tables<"holdings">;

export type HoldingWithPnl = Holding & {
  currentPrice: number | null;
  quoteFetchedAt: string | null;
  currentValue: number | null;
  costBasis: number;
  pnlAbs: number | null;
  pnlPct: number | null;
};

export function computePnl(
  holding: Holding,
  quote: { price: number; fetchedAt: string } | undefined,
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
    currentValue,
    costBasis,
    pnlAbs,
    pnlPct,
  };
}

export function summarizePortfolio(holdings: HoldingWithPnl[]) {
  const totalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue ?? h.costBasis), 0);
  const totalPnlAbs = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnlAbs / totalCost) * 100 : 0;

  return { totalCost, totalValue, totalPnlAbs, totalPnlPct };
}
