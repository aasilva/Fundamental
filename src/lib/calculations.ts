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

// Quantos EUR vale 1 unidade de cada moeda: câmbio de hoje por moeda, e câmbio da data de
// compra por "AAAA-MM-DD|MOEDA". EUR não precisa de estar nas tabelas (vale sempre 1).
export type EurRates = {
  latest: Record<string, number>;
  historical: Record<string, number>;
};

export type EurSummary = {
  totalValue: number;
  totalCost: number;
  totalPnlAbs: number;
  totalPnlPct: number;
  // Parte do lucro/prejuízo que vem da variação das ações, e parte que vem do câmbio.
  pricePnl: number;
  fxPnl: number;
  // Posições que ficaram de fora por falta de câmbio.
  excluded: string[];
};

export function historicalRateKey(date: string, currency: string) {
  return `${date}|${currency}`;
}

// Valor atual da posição em euros (ao custo se não houver cotação); null se faltar o câmbio.
export function valueInEur(h: HoldingWithPnl, rates: EurRates): number | null {
  const rate = h.currency === "EUR" ? 1 : rates.latest[h.currency];
  if (rate === undefined) return null;
  return (h.currentValue ?? h.costBasis) * rate;
}

/**
 * Total da carteira em euros: valor atual ao câmbio de hoje, custo ao câmbio da data de compra.
 * valor − custo = (valor − custo em moeda local) × câmbio de hoje   ← variação das ações
 *               + custo em moeda local × (câmbio de hoje − câmbio da compra)   ← efeito cambial
 */
export function summarizeInEur(holdings: HoldingWithPnl[], rates: EurRates): EurSummary {
  let totalValue = 0;
  let totalCost = 0;
  let pricePnl = 0;
  let fxPnl = 0;
  const excluded: string[] = [];

  for (const h of holdings) {
    const isEur = h.currency === "EUR";
    const latest = isEur ? 1 : rates.latest[h.currency];
    const atPurchase = isEur ? 1 : rates.historical[historicalRateKey(h.entry_date, h.currency)];
    if (latest === undefined || atPurchase === undefined) {
      excluded.push(h.ticker);
      continue;
    }
    // Sem cotação, a posição entra ao custo (como nos totais por moeda): só sobra o efeito cambial.
    const localValue = h.currentValue ?? h.costBasis;
    totalValue += localValue * latest;
    totalCost += h.costBasis * atPurchase;
    pricePnl += (localValue - h.costBasis) * latest;
    fxPnl += h.costBasis * (latest - atPurchase);
  }

  const totalPnlAbs = totalValue - totalCost;
  return {
    totalValue,
    totalCost,
    totalPnlAbs,
    totalPnlPct: totalCost > 0 ? (totalPnlAbs / totalCost) * 100 : 0,
    pricePnl,
    fxPnl,
    excluded,
  };
}
