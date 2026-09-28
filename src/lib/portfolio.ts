import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getQuotes } from "@/lib/quotes";
import { getEurRates } from "@/lib/fx";
import { automaticPolicy } from "@/lib/quote-cache-policy";
import { computePnl, summarizeByCurrency, summarizeInEur, valueInEur } from "@/lib/calculations";

// Dados da carteira usados pela página inicial e pela listagem de ações. Nunca espera pelas
// APIs de cotações: mostra a cache e atualiza em segundo plano (ver lib/quotes.ts).
export async function loadPortfolio() {
  const supabase = await createClient();

  const [{ data: holdings }, { data: settings }] = await Promise.all([
    supabase.from("holdings").select("*").order("entry_date", { ascending: false }),
    supabase.from("user_settings").select("quote_refresh_minutes").maybeSingle(),
  ]);

  const rows = holdings ?? [];
  const refreshMinutes = settings?.quote_refresh_minutes ?? 60;

  const [{ quotes, failures, refreshing }, eurRates] = await Promise.all([
    getQuotes(rows, { policy: automaticPolicy(refreshMinutes), mode: "background" }),
    getEurRates(rows),
  ]);

  const positions = rows.map((h) => computePnl(h, quotes[h.ticker]));
  const eurTotal = summarizeInEur(positions, eurRates);
  const withWeights = positions.map((p) => {
    const eurValue = valueInEur(p, eurRates);
    return {
      ...p,
      eurValue,
      weightPct: eurValue !== null && eurTotal.totalValue > 0 ? (eurValue / eurTotal.totalValue) * 100 : null,
    };
  });

  return {
    positions: withWeights,
    summaries: summarizeByCurrency(positions),
    eurTotal,
    eurRates,
    hasForeign: rows.some((h) => h.currency !== "EUR"),
    failures,
    refreshing,
    refreshMinutes,
  };
}

export type Portfolio = Awaited<ReturnType<typeof loadPortfolio>>;
export type Position = Portfolio["positions"][number];
