import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getQuotes } from "@/lib/quotes";
import { automaticPolicy, MANUAL_REFRESH_FLOOR_MINUTES } from "@/lib/quote-cache-policy";
import { computePnl, summarizeByCurrency, summarizeInEur } from "@/lib/calculations";
import { getEurRates } from "@/lib/fx";
import { formatCurrency, formatDate, formatDateTime, formatPct } from "@/lib/format";
import { DeleteHoldingButton } from "@/components/delete-holding-button";
import { QuoteRefreshPoller } from "@/components/quote-refresh-poller";
import { RefreshQuotesButton } from "@/components/refresh-quotes-button";
import { deleteHolding } from "./holdings/actions";
import { refreshQuotesNow } from "./quotes/actions";

function pnlColor(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-zinc-500 dark:text-zinc-400";
}

// A atualização em segundo plano (after) e o botão "Atualizar" correm dentro deste limite;
// a pesquisa AI pode demorar dezenas de segundos.
export const maxDuration = 300;

const cardClass =
  "rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ atualizadas?: string; em_curso?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: holdings }, { data: settings }] = await Promise.all([
    supabase.from("holdings").select("*").order("entry_date", { ascending: false }),
    supabase.from("user_settings").select("quote_refresh_minutes").maybeSingle(),
  ]);

  const rows = holdings ?? [];
  const refreshMinutes = settings?.quote_refresh_minutes ?? 60;
  // Nunca espera pelas APIs: mostra a cache e atualiza o que estiver desatualizado em segundo plano.
  const [{ quotes, failures, refreshing }, eurRates] = await Promise.all([
    getQuotes(rows, { policy: automaticPolicy(refreshMinutes), mode: "background" }),
    getEurRates(rows),
  ]);

  const withPnl = rows.map((h) => computePnl(h, quotes[h.ticker]));
  const summaries = summarizeByCurrency(withPnl);
  const hasForeign = rows.some((h) => h.currency !== "EUR");
  const eurTotal = hasForeign ? summarizeInEur(withPnl, eurRates) : null;
  const foreignCurrencies = [...new Set(rows.map((h) => h.currency).filter((c) => c !== "EUR"))];
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
        <div className="flex flex-wrap gap-2">
          {rows.length > 0 ? (
            <form action={refreshQuotesNow}>
              <RefreshQuotesButton />
            </form>
          ) : null}
          <Link
            href="/holdings/new"
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            + Adicionar ação
          </Link>
        </div>
      </div>

      {params.atualizadas !== undefined ? (
        <p className="mt-4 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {Number(params.atualizadas) > 0
            ? `${params.atualizadas} cotação(ões) atualizada(s).`
            : `As cotações já estavam atualizadas (o botão só volta a pedir cada ticker ao fim de ${MANUAL_REFRESH_FLOOR_MINUTES} minutos).`}
          {Number(params.em_curso) > 0 ? ` ${params.em_curso} ainda em atualização noutro pedido.` : ""}
        </p>
      ) : null}

      <QuoteRefreshPoller count={refreshing.length} />

      {eurTotal ? (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Total da carteira em euros</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={cardClass}>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Valor atual</p>
              <p className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                {formatCurrency(eurTotal.totalValue, "EUR")}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">ao câmbio de hoje</p>
            </div>
            <div className={cardClass}>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Custo total</p>
              <p className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
                {formatCurrency(eurTotal.totalCost, "EUR")}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">ao câmbio de cada data de compra</p>
            </div>
            <div className={cardClass}>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Lucro / Prejuízo</p>
              <p className={`mt-1 text-xl font-semibold ${pnlColor(eurTotal.totalPnlAbs)}`}>
                {formatCurrency(eurTotal.totalPnlAbs, "EUR")}{" "}
                <span className="text-sm">({formatPct(eurTotal.totalPnlPct)})</span>
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                ações {formatCurrency(eurTotal.pricePnl, "EUR")} · câmbio {formatCurrency(eurTotal.fxPnl, "EUR")}
              </p>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {foreignCurrencies
              .filter((c) => eurRates.latest[c] !== undefined)
              .map((c) => `1 ${c} = ${eurRates.latest[c].toLocaleString("pt-PT", { maximumFractionDigits: 4 })} €`)
              .join(" · ")}
            {eurRates.latestDate ? ` (taxas de referência de ${formatDate(eurRates.latestDate)})` : ""}
            {eurTotal.excluded.length > 0
              ? ` — sem câmbio disponível para ${eurTotal.excluded.join(", ")}, que fica(m) de fora deste total.`
              : ""}
          </p>
        </div>
      ) : null}

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
          — nenhum fornecedor reconheceu o ticker ou os limites de pedidos foram atingidos. Estas
          posições entram nos totais ao preço de custo; a pesquisa é repetida automaticamente mais
          tarde.
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
                    {h.currentPrice !== null ? (
                      <>
                        {formatCurrency(h.currentPrice, h.currency)}
                        {h.quoteSource === "ai_web_search" && h.quoteSourceUrl ? (
                          <a
                            href={h.quoteSourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Cotação obtida por pesquisa AI — confirma na fonte"
                            className="ml-1.5 rounded bg-violet-100 px-1 py-0.5 text-[10px] font-semibold text-violet-700 hover:underline dark:bg-violet-950 dark:text-violet-300"
                          >
                            AI
                          </a>
                        ) : null}
                      </>
                    ) : failures[h.ticker] ? (
                      <span
                        title={failures[h.ticker].detail ?? undefined}
                        className="text-xs text-amber-700 dark:text-amber-400"
                      >
                        {failures[h.ticker].reason === "not_found" ? "não encontrado" : "indisponível"}
                      </span>
                    ) : (
                      "—"
                    )}
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
          Cotação mais antiga: {formatDateTime(oldestQuote)}. Atualização automática a cada{" "}
          {refreshMinutes} min (<Link href="/settings" className="underline">alterar</Link>).
        </p>
      ) : null}
    </div>
  );
}
