import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { METRIC_FIELDS, formatMetricValue } from "@/lib/analysis/format";
import type { AnalysisMetrics } from "@/lib/analysis/tool-schema";
import { formatDate } from "@/lib/format";
import { MetricLabel } from "@/components/metric-label";

export default async function CompanyAnalysisHistoryPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const companyKey = decodeURIComponent(key).toUpperCase();
  const supabase = await createClient();

  const { data: analyses } = await supabase
    .from("stock_analyses")
    .select("id, ticker, company_name, status, requested_at, metrics")
    .eq("company_key", companyKey)
    .eq("status", "completed")
    .order("requested_at", { ascending: true });

  const rows = analyses ?? [];
  if (rows.length === 0) notFound();

  const companyName = rows.at(-1)?.company_name || rows.at(-1)?.ticker || companyKey;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <Link href="/analysis" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← Todas as análises
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{companyName}</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Evolução das métricas ao longo de {rows.length} análises.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-zinc-500 dark:border-white/10 dark:text-zinc-400">
              <th className="px-4 py-3 font-medium">Métrica</th>
              {rows.map((r) => (
                <th key={r.id} className="px-4 py-3 text-right font-medium">
                  <Link href={`/analysis/${r.id}`} className="hover:underline">
                    {formatDate(r.requested_at)}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRIC_FIELDS.map((f) => {
              const hasAny = rows.some((r) => (r.metrics as AnalysisMetrics | null)?.[f.key] !== null);
              if (!hasAny) return null;
              return (
                <tr key={f.key} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">
                    <MetricLabel metricKey={f.key} title={f.title} />
                  </td>
                  {rows.map((r) => {
                    const m = r.metrics as AnalysisMetrics | null;
                    return (
                      <td key={r.id} className="px-4 py-2 text-right font-medium text-zinc-950 dark:text-zinc-50">
                        {m ? formatMetricValue(m[f.key], f.unit, m.currency) : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
