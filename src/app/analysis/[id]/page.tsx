import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimAndRunAnalysisStep } from "@/lib/analysis/runner";
import { METRIC_FIELDS, formatMetricValue } from "@/lib/analysis/format";
import type { AnalysisMetrics, AnalysisSections, AnalysisSource } from "@/lib/analysis/tool-schema";
import { formatDateTime } from "@/lib/format";
import { importSourceLabel } from "@/lib/analysis/import";
import { AnalysisStatusBadge } from "@/components/analysis-status-badge";
import { AnalysisPoller } from "@/components/analysis-poller";
import { MarkdownReport } from "@/components/markdown-report";
import { SubmitButton } from "@/components/submit-button";
import { retryAnalysis } from "../actions";

// O trabalho em segundo plano (after()) corre dentro do tempo desta rota; uma análise profunda
// pode precisar de várias invocações — ver TIME_BUDGET_MS em lib/analysis/runner.ts.
export const maxDuration = 300;

export default async function AnalysisDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ avisos?: string }>;
}) {
  const { id } = await params;
  const { avisos } = await searchParams;
  const warnings = avisos ? avisos.split("|").filter(Boolean) : [];
  const supabase = await createClient();

  const { data: analysis } = await supabase.from("stock_analyses").select("*").eq("id", id).single();
  if (!analysis) notFound();

  const isActive = analysis.status === "pending" || analysis.status === "running";
  if (isActive) {
    // Mesmo padrão das cotações: cada visita a esta página dá um "empurrão" ao agente. Se já
    // estiver reservada por outra invocação, claimAndRunAnalysisStep não faz nada.
    after(() => claimAndRunAnalysisStep(id));
  }

  const sections = analysis.sections as AnalysisSections | null;
  const metrics = analysis.metrics as AnalysisMetrics | null;
  const sources = (analysis.sources as AnalysisSource[] | null) ?? [];
  const state = analysis.run_state as { turns?: number } | null;
  const importedFrom = importSourceLabel(analysis.model);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/analysis" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← Todas as análises
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          {sections?.company_name_resolved || analysis.company_name || analysis.ticker}
        </h1>
        <AnalysisStatusBadge status={analysis.status} />
      </div>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {analysis.ticker}
        {sections?.exchange ? ` · ${sections.exchange}` : ""}
        {importedFrom ? ` · importada do ${importedFrom} em ` : " · pedida em "}
        {formatDateTime(analysis.requested_at)}
      </p>

      {warnings.length > 0 ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">Análise guardada, com avisos:</p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {isActive ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium">
            {analysis.status === "pending" ? "A preparar a análise…" : "A pesquisar e a escrever a análise…"}
          </p>
          <p className="mt-1">
            Isto costuma demorar alguns minutos — pesquisa muitas fontes antes de escrever cada
            secção. Podes fechar esta página; ao voltares, continua de onde ficou.
            {state?.turns ? ` (${state.turns} etapa(s) concluída(s) até agora.)` : ""}
          </p>
          <AnalysisPoller active />
        </div>
      ) : null}

      {analysis.status === "failed" ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          <p className="font-medium">A análise falhou.</p>
          <p className="mt-1">{analysis.error}</p>
          <form action={retryAnalysis} className="mt-3">
            <input type="hidden" name="id" value={analysis.id} />
            <SubmitButton>Tentar novamente</SubmitButton>
          </form>
        </div>
      ) : null}

      {analysis.status === "completed" && sections ? (
        <>
          {sections.resumo_executivo ? (
            <div className="mt-6 rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Resumo</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {sections.resumo_executivo}
              </p>
            </div>
          ) : null}

          {sections.evolucao_desde_ultima_analise ? (
            <div className="mt-4 rounded-xl border border-zinc-950/10 bg-zinc-50 p-5 dark:border-zinc-50/10 dark:bg-zinc-900">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Evolução desde a última análise
              </h2>
              <div className="mt-1">
                <MarkdownReport content={sections.evolucao_desde_ultima_analise} />
              </div>
            </div>
          ) : null}

          {metrics ? (
            <div className="mt-4 overflow-x-auto rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
              <table className="w-full text-sm">
                <tbody>
                  {METRIC_FIELDS.filter((f) => metrics[f.key] !== null).map((f) => (
                    <tr key={f.key} className="border-b border-black/5 last:border-0 dark:border-white/5">
                      <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{f.title}</td>
                      <td className="px-4 py-2 text-right font-medium text-zinc-950 dark:text-zinc-50">
                        {formatMetricValue(metrics[f.key], f.unit, metrics.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {metrics.as_of ? (
                <p className="px-4 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                  Dados financeiros reportados a {metrics.as_of}.
                </p>
              ) : null}
            </div>
          ) : null}

          <article className="mt-4 rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
            <MarkdownReport content={analysis.report_markdown ?? ""} />
          </article>

          {sources.length > 0 ? (
            <div className="mt-4 rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Fontes</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {sources.map((s, i) => (
                  <li key={i}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-600 underline hover:no-underline dark:text-zinc-400"
                    >
                      {s.title || s.url}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
            Relatório gerado por IA com pesquisa web — confirma sempre os números críticos nas fontes
            antes de tomar decisões de investimento.
          </p>
        </>
      ) : null}
    </div>
  );
}
