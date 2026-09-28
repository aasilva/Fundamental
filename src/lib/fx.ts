import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { historicalRateKey, type EurRates } from "@/lib/calculations";

// Frankfurter: gratuito, sem chave, agrega taxas de referência de bancos centrais (incluindo o BCE).
const API_URL = "https://api.frankfurter.dev/v2/rates";
// O câmbio "de hoje" é uma taxa de referência diária; atualizar a cada 6h chega e poupa pedidos.
const LATEST_TTL_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 4000;

type Admin = ReturnType<typeof createAdminClient>;
export type ParsedRate = { eurRate: number; date: string };

// A API devolve [{ date, base: "EUR", quote: "USD", rate: 1.14 }] = 1 EUR vale 1,14 USD.
// Guardamos o inverso (quantos EUR vale 1 USD), que é o que os cálculos usam.
export function parseFrankfurterRates(data: unknown): Map<string, ParsedRate> {
  const rates = new Map<string, ParsedRate>();
  if (!Array.isArray(data)) return rates;
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const { base, quote, rate, date } = item as Record<string, unknown>;
    if (base !== "EUR" || typeof quote !== "string" || typeof date !== "string") continue;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) continue;
    rates.set(quote.toUpperCase(), { eurRate: 1 / rate, date });
  }
  return rates;
}

async function fetchRates(currencies: string[], date?: string): Promise<Map<string, ParsedRate>> {
  const url = new URL(API_URL);
  url.searchParams.set("base", "EUR");
  url.searchParams.set("quotes", currencies.join(","));
  if (date) url.searchParams.set("date", date);
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`câmbios: HTTP ${response.status}`);
  return parseFrankfurterRates(await response.json());
}

async function refreshLatest(admin: Admin, currencies: string[]) {
  try {
    const rates = await fetchRates(currencies);
    const now = new Date().toISOString();
    const rows = [...rates].map(([currency, r]) => ({
      currency,
      eur_rate: r.eurRate,
      rate_date: r.date,
      fetched_at: now,
    }));
    if (rows.length > 0) await admin.from("fx_rates_latest").upsert(rows, { onConflict: "currency" });
    return rates;
  } catch (error) {
    console.error("Falha ao obter câmbios atuais:", (error as Error).message);
    return new Map<string, ParsedRate>();
  }
}

async function fetchHistorical(admin: Admin, date: string, currencies: string[]) {
  try {
    const rates = await fetchRates(currencies, date);
    const rows = [...rates].map(([currency, r]) => ({
      rate_date: date,
      currency,
      eur_rate: r.eurRate,
      source_date: r.date,
    }));
    if (rows.length > 0) {
      await admin.from("fx_rates_historical").upsert(rows, { onConflict: "rate_date,currency" });
    }
    return rows;
  } catch (error) {
    console.error(`Falha ao obter câmbios de ${date}:`, (error as Error).message);
    return [];
  }
}

export type EurRatesResult = EurRates & { latestDate: string | null };

function laterDate(a: string | null, b: string): string {
  return a !== null && a > b ? a : b;
}

/**
 * Câmbios para converter a carteira em euros. Usa a cache na base de dados: câmbios históricos
 * são pedidos uma vez e guardados para sempre; o de hoje é reaproveitado e, se tiver mais de 6h,
 * atualizado em segundo plano (o dashboard só espera pela API se ainda não houver nenhum valor).
 */
export async function getEurRates(
  holdings: Array<{ currency: string; entry_date: string }>,
): Promise<EurRatesResult> {
  const foreign = holdings.filter((h) => h.currency !== "EUR");
  const currencies = [...new Set(foreign.map((h) => h.currency))];
  if (currencies.length === 0) return { latest: {}, historical: {}, latestDate: null };

  const admin = createAdminClient();
  const latest: Record<string, number> = {};
  let latestDate: string | null = null;

  const { data: latestRows } = await admin.from("fx_rates_latest").select("*").in("currency", currencies);
  for (const row of latestRows ?? []) {
    latest[row.currency] = row.eur_rate;
    latestDate = laterDate(latestDate, row.rate_date);
  }

  const missing = currencies.filter((c) => latest[c] === undefined);
  const stale = (latestRows ?? []).some((r) => Date.now() - new Date(r.fetched_at).getTime() > LATEST_TTL_MS);

  if (missing.length > 0) {
    const fresh = await refreshLatest(admin, currencies);
    for (const [currency, r] of fresh) {
      latest[currency] = r.eurRate;
      latestDate = laterDate(latestDate, r.date);
    }
  } else if (stale) {
    after(() => refreshLatest(admin, currencies));
  }

  // Câmbio da data de compra de cada posição.
  const today = new Date().toISOString().slice(0, 10);
  const historical: Record<string, number> = {};
  const needed = new Map<string, Set<string>>(); // data → moedas
  for (const h of foreign) {
    if (h.entry_date > today) continue; // data de compra no futuro: tratada abaixo com o câmbio de hoje
    if (!needed.has(h.entry_date)) needed.set(h.entry_date, new Set());
    needed.get(h.entry_date)!.add(h.currency);
  }

  if (needed.size > 0) {
    const { data: cachedRows } = await admin
      .from("fx_rates_historical")
      .select("rate_date, currency, eur_rate")
      .in("rate_date", [...needed.keys()])
      .in("currency", currencies);
    for (const row of cachedRows ?? []) {
      historical[historicalRateKey(row.rate_date, row.currency)] = row.eur_rate;
    }

    const toFetch = [...needed]
      .map(([date, curs]) => [date, [...curs].filter((c) => historical[historicalRateKey(date, c)] === undefined)] as const)
      .filter(([, curs]) => curs.length > 0);
    const fetched = await Promise.all(toFetch.map(([date, curs]) => fetchHistorical(admin, date, curs)));
    for (const row of fetched.flat()) {
      historical[historicalRateKey(row.rate_date, row.currency)] = row.eur_rate;
    }
  }

  for (const h of foreign) {
    if (h.entry_date > today && latest[h.currency] !== undefined) {
      historical[historicalRateKey(h.entry_date, h.currency)] = latest[h.currency];
    }
  }

  return { latest, historical, latestDate };
}
