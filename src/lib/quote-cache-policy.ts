import type { ProviderResult, QuoteProvider, QuoteRequest } from "./quote-providers/types";

const MINUTE = 60_000;

export type RefreshPolicy = {
  ttlMinutes: number;
  aiTtlMinutes: number;
  notFoundRetryMinutes: number;
  unavailableRetryMinutes: number;
};

export const DEFAULT_REFRESH_MINUTES = 60;
// Botão "Atualizar": ignora o intervalo configurado, mas nunca repete um ticker
// tratado há menos de 5 min (cliques repetidos não gastam pedidos às APIs).
export const MANUAL_REFRESH_FLOOR_MINUTES = 5;

// Atualização automática, com o intervalo escolhido pelo utilizador nas definições.
export function automaticPolicy(userRefreshMinutes = DEFAULT_REFRESH_MINUTES): RefreshPolicy {
  return {
    ttlMinutes: userRefreshMinutes,
    // Cotações por pesquisa AI custam dinheiro: automaticamente, nunca mais que o mínimo configurado.
    aiTtlMinutes: Math.max(userRefreshMinutes, Number(process.env.QUOTE_AI_CACHE_TTL_MINUTES ?? 360)),
    notFoundRetryMinutes: Number(process.env.QUOTE_NOT_FOUND_RETRY_HOURS ?? 24) * 60,
    unavailableRetryMinutes: Number(process.env.QUOTE_UNAVAILABLE_RETRY_MINUTES ?? 60),
  };
}

export const MANUAL_POLICY: RefreshPolicy = {
  ttlMinutes: MANUAL_REFRESH_FLOOR_MINUTES,
  aiTtlMinutes: MANUAL_REFRESH_FLOOR_MINUTES,
  notFoundRetryMinutes: MANUAL_REFRESH_FLOOR_MINUTES,
  unavailableRetryMinutes: MANUAL_REFRESH_FLOOR_MINUTES,
};

type CachedQuote = { source: string; fetched_at: string };
type LookupFailure = { reason: string; failed_at: string };

export function shouldRefresh(
  cached: CachedQuote | undefined,
  failure: LookupFailure | undefined,
  now: number,
  config: RefreshPolicy,
) {
  if (cached) {
    const ttl = cached.source === "ai_web_search" ? config.aiTtlMinutes : config.ttlMinutes;
    if (new Date(cached.fetched_at).getTime() > now - ttl * MINUTE) return false;
  }
  if (failure) {
    const backoff =
      failure.reason === "not_found" ? config.notFoundRetryMinutes : config.unavailableRetryMinutes;
    if (new Date(failure.failed_at).getTime() > now - backoff * MINUTE) return false;
  }
  return true;
}

export async function runProviderChain(
  request: QuoteRequest,
  providers: QuoteProvider[],
): Promise<ProviderResult> {
  const failures: Extract<ProviderResult, { ok: false }>[] = [];

  for (const provider of providers) {
    if (!provider.isConfigured()) continue;
    const result = await provider.fetchQuote(request);
    if (result.ok) return result;
    failures.push({ ...result, detail: `${provider.source}: ${result.detail}` });
  }

  if (failures.length === 0) {
    return { ok: false, reason: "unavailable", detail: "nenhum fornecedor de cotações configurado" };
  }
  // Se algum fornecedor falhou por limite/erro, o ticker pode existir: tentar de novo mais cedo.
  return {
    ok: false,
    reason: failures.some((f) => f.reason === "unavailable") ? "unavailable" : "not_found",
    detail: failures.map((f) => f.detail).join("; "),
  };
}
