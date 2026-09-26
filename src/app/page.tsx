import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getQuotesForTickers } from "@/lib/quotes";
import { computePnl, summarizeByCurrency } from "@/lib/calculations";
import { formatCurrency, formatDate, formatDateTime, formatPct } from "@/lib/format";
import { DeleteHoldingButton } from "@/components/delete-holding-button";
import { deleteHolding } from "./holdings/actions";

function pnlColor(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-zinc-500 dark:text-zinc-400";
}

const cardClass =
  "rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: holdings } = await supabase
    .from("holdings")
    .select("*")
    .order("entry_date", { ascending: false });

  const rows = holdings ?? [];
  const quotes = await getQuotesForTickers(rows.map((h) => h.ticker));

  const withPnl = rows.map((h) => computePnl(h, quotes[h.ticker]));
  const summaries = summarizeByCurrency(withPnl);
  const missingQuotes = withPnl.filter((h) => h.currentPrice === null).length;
  const oldestQuote = withPnl
    .map((h) => h.quoteFetchedAt)
    .filter((d): d is string => d !== null)
    .sort()[0];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
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

      {summaries.map((s) => (
        <div key={s.currency} className="mt-6">
          {summaries.length > 1 ? (
            <h2 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Posições em {s.currency}
            </h2>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={cardClass}>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Valor atual</p>
              <p className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                {formatCurrency(s.totalValue, s.currency)}
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Custo total</p>
              <p className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                {formatCurrency(s.totalCost, s.currency)}
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Lucro / Prejuízo</p>
              <p className={`mt-1 text-xl font-semibold ${pnlColor(s.totalPnlAbs)}`}>
                {formatCurrency(s.totalPnlAbs, s.currency)}{" "}
                <span className="text-sm">({formatPct(s.totalPnlPct)})</span>
              </p>
            </div>
          </div>
        </div>
      ))}

      {missingQuotes > 0 ? (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {missingQuotes === 1 ? "1 posição sem cotação" : `${missingQuotes} posições sem cotação`}{" "}
          (ticker não reconhecido pela Alpha Vantage ou limite de pedidos atingido). Estas posições
          entram nos totais ao preço de custo.
        </p>
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
                    {formatDate(h.entry_date)}
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
                        <DeleteHoldingButton ticker={h.ticker} />
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {oldestQuote ? (
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          Cotações atualizadas desde {formatDateTime(oldestQuote)} (cache de{" "}
          {process.env.QUOTE_CACHE_TTL_MINUTES ?? 60} min).
        </p>
      ) : null}
    </div>
  );
}
