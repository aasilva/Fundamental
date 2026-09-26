import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getQuotesForTickers } from "@/lib/quotes";
import { computePnl, summarizePortfolio } from "@/lib/calculations";
import { deleteHolding } from "./holdings/actions";

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value);
}

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function pnlColor(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-zinc-500 dark:text-zinc-400";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: holdings } = await supabase
    .from("holdings")
    .select("*")
    .order("entry_date", { ascending: false });

  const rows = holdings ?? [];
  const quotes = await getQuotesForTickers(rows.map((h) => h.ticker));

  const withPnl = rows.map((h) => computePnl(h, quotes[h.ticker]));
  const summary = summarizePortfolio(withPnl);
  const baseCurrency = rows[0]?.currency ?? "EUR";

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
          A minha carteira
        </h1>
        <Link
          href="/holdings/new"
          className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          + Adicionar ação
        </Link>
      </div>

      {rows.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Valor atual</p>
            <p className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              {formatCurrency(summary.totalValue, baseCurrency)}
            </p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Custo total</p>
            <p className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              {formatCurrency(summary.totalCost, baseCurrency)}
            </p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Lucro / Prejuízo</p>
            <p className={`mt-1 text-xl font-semibold ${pnlColor(summary.totalPnlAbs)}`}>
              {formatCurrency(summary.totalPnlAbs, baseCurrency)}{" "}
              <span className="text-sm">({formatPct(summary.totalPnlPct)})</span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-950">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-zinc-500 dark:text-zinc-400">
            Ainda não tens ações registadas.{" "}
            <Link href="/holdings/new" className="font-medium text-zinc-950 underline dark:text-zinc-50">
              Adiciona a primeira
            </Link>
            .
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                <th className="px-4 py-3 font-medium">Ticker</th>
                <th className="px-4 py-3 font-medium">Data entrada</th>
                <th className="px-4 py-3 font-medium text-right">Quantidade</th>
                <th className="px-4 py-3 font-medium text-right">Preço entrada</th>
                <th className="px-4 py-3 font-medium text-right">Cotação atual</th>
                <th className="px-4 py-3 font-medium text-right">Valor atual</th>
                <th className="px-4 py-3 font-medium text-right">Lucro / Prejuízo</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {withPnl.map((h) => (
                <tr key={h.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-950 dark:text-zinc-50">{h.ticker}</div>
                    {h.name ? (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{h.name}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {new Date(h.entry_date).toLocaleDateString("pt-PT")}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                    {h.quantity}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(h.entry_price, h.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                    {h.currentPrice !== null ? formatCurrency(h.currentPrice, h.currency) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-700 dark:text-zinc-300">
                    {h.currentValue !== null ? formatCurrency(h.currentValue, h.currency) : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${h.pnlAbs !== null ? pnlColor(h.pnlAbs) : ""}`}>
                    {h.pnlAbs !== null ? (
                      <>
                        {formatCurrency(h.pnlAbs, h.currency)}{" "}
                        <span className="text-xs">({formatPct(h.pnlPct ?? 0)})</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/holdings/${h.id}/edit`}
                        className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      >
                        Editar
                      </Link>
                      <form action={deleteHolding}>
                        <input type="hidden" name="id" value={h.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                        >
                          Eliminar
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
