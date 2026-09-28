import type { CurrencySummary, EurSummary } from "@/lib/calculations";
import type { EurRatesResult } from "@/lib/fx";
import { formatCurrency, formatDate, formatPct, pnlColor } from "@/lib/format";

const cardClass = "rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950";
const labelClass = "text-sm text-zinc-500 dark:text-zinc-400";
const valueClass = "mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50";
const hintClass = "mt-1 text-xs text-zinc-500 dark:text-zinc-400";

export function EurTotalCards({
  total,
  rates,
  foreignCurrencies,
  title,
}: {
  total: EurSummary;
  rates: EurRatesResult;
  foreignCurrencies: string[];
  title?: string;
}) {
  const hasForeign = foreignCurrencies.length > 0;
  return (
    <div>
      {title ? <h2 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</h2> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <p className={labelClass}>Valor atual</p>
          <p className={valueClass}>{formatCurrency(total.totalValue, "EUR")}</p>
          {hasForeign ? <p className={hintClass}>ao câmbio de hoje</p> : null}
        </div>
        <div className={cardClass}>
          <p className={labelClass}>Custo total</p>
          <p className={valueClass}>{formatCurrency(total.totalCost, "EUR")}</p>
          {hasForeign ? <p className={hintClass}>ao câmbio de cada data de compra</p> : null}
        </div>
        <div className={cardClass}>
          <p className={labelClass}>Lucro / Prejuízo</p>
          <p className={`mt-1 text-xl font-semibold ${pnlColor(total.totalPnlAbs)}`}>
            {formatCurrency(total.totalPnlAbs, "EUR")}{" "}
            <span className="text-sm">({formatPct(total.totalPnlPct)})</span>
          </p>
          {hasForeign ? (
            <p className={hintClass}>
              ações {formatCurrency(total.pricePnl, "EUR")} · câmbio {formatCurrency(total.fxPnl, "EUR")}
            </p>
          ) : null}
        </div>
      </div>
      {hasForeign ? (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          {foreignCurrencies
            .filter((c) => rates.latest[c] !== undefined)
            .map((c) => `1 ${c} = ${rates.latest[c].toLocaleString("pt-PT", { maximumFractionDigits: 4 })} €`)
            .join(" · ")}
          {rates.latestDate ? ` (taxas de referência de ${formatDate(rates.latestDate)})` : ""}
          {total.excluded.length > 0
            ? ` — sem câmbio disponível para ${total.excluded.join(", ")}, que fica(m) de fora deste total.`
            : ""}
        </p>
      ) : null}
    </div>
  );
}

export function CurrencyTotals({ summaries }: { summaries: CurrencySummary[] }) {
  return (
    <>
      {summaries.map((s) => (
        <div key={s.currency} className="mt-6">
          {summaries.length > 1 ? (
            <h2 className="mb-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Posições em {s.currency}</h2>
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className={cardClass}>
              <p className={labelClass}>Valor atual</p>
              <p className={valueClass}>{formatCurrency(s.totalValue, s.currency)}</p>
            </div>
            <div className={cardClass}>
              <p className={labelClass}>Custo total</p>
              <p className={valueClass}>{formatCurrency(s.totalCost, s.currency)}</p>
            </div>
            <div className={cardClass}>
              <p className={labelClass}>Lucro / Prejuízo</p>
              <p className={`mt-1 text-xl font-semibold ${pnlColor(s.totalPnlAbs)}`}>
                {formatCurrency(s.totalPnlAbs, s.currency)}{" "}
                <span className="text-sm">({formatPct(s.totalPnlPct)})</span>
              </p>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
