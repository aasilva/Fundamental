import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { loadPortfolio } from "@/lib/portfolio";
import { termOfTheDay } from "@/lib/glossary";
import { formatCurrency, formatDateTime, formatPct, pnlColor } from "@/lib/format";
import { EurTotalCards } from "@/components/portfolio-totals";
import { QuoteRefreshPoller } from "@/components/quote-refresh-poller";
import { AnalysisStatusBadge } from "@/components/analysis-status-badge";

// A atualização das cotações em segundo plano (after) corre dentro deste limite.
export const maxDuration = 300;

const TOP_POSITIONS = 6;
const RECENT_ANALYSES = 4;

const panelClass = "rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950";
const panelTitleClass = "text-sm font-semibold text-zinc-950 dark:text-zinc-50";
const linkClass = "text-sm text-zinc-500 hover:text-zinc-950 hover:underline dark:text-zinc-400 dark:hover:text-zinc-50";

function StatTile({ label, value, hint, valueClass }: { label: string; value: string; hint?: string; valueClass?: string }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-1 truncate text-lg font-semibold ${valueClass ?? "text-zinc-950 dark:text-zinc-50"}`}>{value}</p>
      {hint ? <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
    </div>
  );
}

export default async function HomePage() {
  const supabase = await createClient();
  const [portfolio, { data: analyses, count: analysisCount }, { count: activeAnalyses }] = await Promise.all([
    loadPortfolio(),
    supabase
      .from("stock_analyses")
      .select("id, ticker, company_name, status, requested_at, sections", { count: "exact" })
      .order("requested_at", { ascending: false })
      .limit(RECENT_ANALYSES),
    supabase
      .from("stock_analyses")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "running"]),
  ]);

  const { positions, eurTotal, eurRates, refreshing } = portfolio;
  const foreignCurrencies = [...new Set(positions.map((p) => p.currency).filter((c) => c !== "EUR"))];
  const ranked = positions.filter((p) => p.pnlPct !== null).sort((a, b) => b.pnlPct! - a.pnlPct!);
  const best = ranked[0];
  const worst = ranked.length > 1 ? ranked[ranked.length - 1] : undefined;
  const topPositions = [...positions].sort((a, b) => (b.eurValue ?? 0) - (a.eurValue ?? 0)).slice(0, TOP_POSITIONS);
  const term = termOfTheDay();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Visão geral</h1>

      <QuoteRefreshPoller count={refreshing.length} />

      {positions.length === 0 ? (
        <div className={`${panelClass} mt-6`}>
          <p className={panelTitleClass}>Bem-vindo! Começa por aqui:</p>
          <ul className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li>
              <Link href="/holdings/new" className="font-medium underline">
                Adicionar a primeira ação
              </Link>{" "}
              — para acompanhar cotações e lucros.
            </li>
            <li>
              <Link href="/analysis" className="font-medium underline">
                Analisar uma empresa
              </Link>{" "}
              — análise fundamental completa, guardada para comparares no futuro.
            </li>
            <li>
              <Link href="/glossary" className="font-medium underline">
                Ver o glossário
              </Link>{" "}
              — os termos financeiros explicados com exemplos.
            </li>
          </ul>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <EurTotalCards total={eurTotal} rates={eurRates} foreignCurrencies={foreignCurrencies} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Posições"
              value={String(positions.length)}
              hint={foreignCurrencies.length > 0 ? `em ${foreignCurrencies.length + 1} moedas` : "todas em euros"}
            />
            <StatTile
              label="Melhor posição"
              value={best ? formatPct(best.pnlPct!) : "—"}
              hint={best?.ticker}
              valueClass={best ? pnlColor(best.pnlPct!) : undefined}
            />
            <StatTile
              label="Pior posição"
              value={worst ? formatPct(worst.pnlPct!) : "—"}
              hint={worst?.ticker}
              valueClass={worst ? pnlColor(worst.pnlPct!) : undefined}
            />
            <StatTile
              label="Análises"
              value={String(analysisCount ?? 0)}
              hint={activeAnalyses ? `${activeAnalyses} em curso` : undefined}
            />
          </div>
        </>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {positions.length > 0 ? (
          <section className={panelClass}>
            <div className="flex items-center justify-between gap-4">
              <h2 className={panelTitleClass}>Maiores posições</h2>
              <Link href="/holdings" className={linkClass}>
                Ver todas ({positions.length}) →
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-black/5 dark:divide-white/5">
              {topPositions.map((p) => (
                <li key={p.id} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <span className="font-medium text-zinc-950 dark:text-zinc-50">{p.ticker}</span>
                      {p.name ? <span className="ml-2 truncate text-zinc-500 dark:text-zinc-400">{p.name}</span> : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {p.eurValue !== null ? formatCurrency(p.eurValue, "EUR") : "—"}
                      </span>
                      <span className={`ml-3 inline-block w-16 font-medium ${p.pnlPct !== null ? pnlColor(p.pnlPct) : "text-zinc-400"}`}>
                        {p.pnlPct !== null ? formatPct(p.pnlPct) : "—"}
                      </span>
                    </div>
                  </div>
                  {p.weightPct !== null ? (
                    <div className="mt-1.5 flex items-center gap-2" title={`${p.weightPct.toFixed(1)}% da carteira`}>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className="h-full rounded-full bg-zinc-400 dark:bg-zinc-500" style={{ width: `${Math.min(p.weightPct, 100)}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs text-zinc-500 dark:text-zinc-400">{p.weightPct.toFixed(1)}%</span>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={panelClass}>
          <div className="flex items-center justify-between gap-4">
            <h2 className={panelTitleClass}>Análises recentes</h2>
            <Link href="/analysis" className={linkClass}>
              {(analyses ?? []).length > 0 ? "Ver todas →" : "Fazer uma análise →"}
            </Link>
          </div>
          {(analyses ?? []).length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Ainda não analisaste nenhuma empresa. Podes pedir uma análise automática ou importar uma feita no
              ChatGPT ou no Claude.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-black/5 dark:divide-white/5">
              {(analyses ?? []).map((a) => {
                const summary = (a.sections as { resumo_executivo?: string } | null)?.resumo_executivo;
                return (
                  <li key={a.id} className="py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/analysis/${a.id}`} className="text-sm font-medium text-zinc-950 hover:underline dark:text-zinc-50">
                        {a.company_name || a.ticker}
                      </Link>
                      <AnalysisStatusBadge status={a.status} />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{formatDateTime(a.requested_at)}</span>
                    </div>
                    {summary ? (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">{summary}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={`${panelClass} ${positions.length > 0 ? "lg:col-span-2" : ""}`}>
          <div className="flex items-center justify-between gap-4">
            <h2 className={panelTitleClass}>Termo do dia</h2>
            <Link href="/glossary" className={linkClass}>
              Glossário →
            </Link>
          </div>
          <Link href={`/glossary#${term.id}`} className="mt-3 block group">
            <p className="font-medium text-zinc-950 group-hover:underline dark:text-zinc-50">
              {term.en} <span className="font-normal text-zinc-500 dark:text-zinc-400">· {term.pt}</span>
            </p>
            <p className="mt-1 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">{term.definition}</p>
          </Link>
        </section>
      </div>
    </div>
  );
}
