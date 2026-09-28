import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import { AnalysisStatusBadge } from "@/components/analysis-status-badge";
import { startAnalysis, deleteAnalysis } from "./actions";

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";

export default async function AnalysisListPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: analyses } = await supabase
    .from("stock_analyses")
    .select("id, ticker, company_key, company_name, status, requested_at, sections")
    .order("requested_at", { ascending: false });

  const rows = analyses ?? [];
  const companiesWithMultiple = new Set(
    Object.entries(
      rows.reduce<Record<string, number>>((acc, r) => {
        acc[r.company_key] = (acc[r.company_key] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .filter(([, n]) => n > 1)
      .map(([key]) => key),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Análise de ações</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Análise fundamental profunda, feita por um agente com pesquisa web. Fica guardada e é usada
        para comparar com a próxima análise à mesma empresa.
      </p>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <Link
        href="/analysis/import"
        className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-black/10 bg-white p-5 hover:border-zinc-400 dark:border-white/10 dark:bg-zinc-950 dark:hover:border-zinc-600"
      >
        <div>
          <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
            Importar análise do ChatGPT ou do Claude
          </p>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Gera o prompt, faz a análise com a tua subscrição e cola aqui o resultado — sem custos de API.
          </p>
        </div>
        <span className="text-zinc-400">→</span>
      </Link>

      <form
        action={startAnalysis}
        className="mt-6 flex flex-col gap-4 rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950"
      >
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          Nova análise automática (API, com custo)
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label htmlFor="ticker" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Ticker
            </label>
            <input id="ticker" name="ticker" required placeholder="AAPL" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label htmlFor="company_name" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nome (opcional)
            </label>
            <input id="company_name" name="company_name" placeholder="Apple Inc." className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-1">
            <label htmlFor="isin" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              ISIN (opcional)
            </label>
            <input id="isin" name="isin" placeholder="US0378331005" className={inputClass} />
          </div>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          O nome ajuda o agente a identificar a empresa certa quando o ticker é ambíguo. A análise
          demora normalmente alguns minutos e tem custo (pesquisa web + IA) — só podes ter uma em
          curso de cada vez.
        </p>
        <div>
          <SubmitButton>Iniciar análise</SubmitButton>
        </div>
      </form>

      <div className="mt-8 overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 dark:text-zinc-400">
            Ainda não fizeste nenhuma análise.
          </div>
        ) : (
          <ul className="divide-y divide-black/5 dark:divide-white/5">
            {rows.map((a) => {
              const sections = a.sections as { resumo_executivo?: string } | null;
              return (
                <li key={a.id} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/analysis/${a.id}`}
                        className="font-medium text-zinc-950 hover:underline dark:text-zinc-50"
                      >
                        {a.ticker}
                      </Link>
                      {a.company_name ? (
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">{a.company_name}</span>
                      ) : null}
                      <AnalysisStatusBadge status={a.status} />
                    </div>
                    {sections?.resumo_executivo ? (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {sections.resumo_executivo}
                      </p>
                    ) : null}
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{formatDateTime(a.requested_at)}</span>
                      {companiesWithMultiple.has(a.company_key) ? (
                        <Link href={`/analysis/company/${encodeURIComponent(a.company_key)}`} className="underline">
                          Ver histórico desta empresa
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <form action={deleteAnalysis}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Eliminar
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
