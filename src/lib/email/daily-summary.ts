import type { HoldingWithPnl } from "@/lib/calculations";

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value);
}

function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

export function renderDailySummaryEmail({
  holdings,
  totalCost,
  totalValue,
  totalPnlAbs,
  totalPnlPct,
  currency,
  alertTriggered,
  alertThresholdPct,
}: {
  holdings: HoldingWithPnl[];
  totalCost: number;
  totalValue: number;
  totalPnlAbs: number;
  totalPnlPct: number;
  currency: string;
  alertTriggered: boolean;
  alertThresholdPct: number;
}) {
  const pnlColor = totalPnlAbs >= 0 ? "#059669" : "#dc2626";

  const rows = holdings
    .map((h) => {
      const color = (h.pnlAbs ?? 0) >= 0 ? "#059669" : "#dc2626";
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e5e5;">${h.ticker}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${h.currentPrice !== null ? formatCurrency(h.currentPrice, h.currency) : "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">${h.currentValue !== null ? formatCurrency(h.currentValue, h.currency) : "—"}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;color:${color};">${h.pnlAbs !== null ? `${formatCurrency(h.pnlAbs, h.currency)} (${formatPct(h.pnlPct ?? 0)})` : "—"}</td>
        </tr>`;
    })
    .join("");

  const alertBanner = alertTriggered
    ? `<div style="margin:16px 0;padding:12px 16px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:14px;">
        ⚠️ A tua carteira ultrapassou o limite de ${alertThresholdPct}% de variação definido nas notificações.
      </div>`
    : "";

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#18181b;">
      <h1 style="font-size:20px;">Resumo diário da carteira</h1>
      ${alertBanner}
      <div style="display:flex;gap:16px;margin:16px 0;">
        <div style="flex:1;padding:12px;background:#fafafa;border-radius:8px;">
          <div style="font-size:12px;color:#71717a;">Valor atual</div>
          <div style="font-size:18px;font-weight:600;">${formatCurrency(totalValue, currency)}</div>
        </div>
        <div style="flex:1;padding:12px;background:#fafafa;border-radius:8px;">
          <div style="font-size:12px;color:#71717a;">Custo total</div>
          <div style="font-size:18px;font-weight:600;">${formatCurrency(totalCost, currency)}</div>
        </div>
        <div style="flex:1;padding:12px;background:#fafafa;border-radius:8px;">
          <div style="font-size:12px;color:#71717a;">Lucro / Prejuízo</div>
          <div style="font-size:18px;font-weight:600;color:${pnlColor};">${formatCurrency(totalPnlAbs, currency)} (${formatPct(totalPnlPct)})</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="text-align:left;color:#71717a;">
            <th style="padding:8px;border-bottom:1px solid #e5e5e5;">Ticker</th>
            <th style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">Cotação</th>
            <th style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">Valor</th>
            <th style="padding:8px;border-bottom:1px solid #e5e5e5;text-align:right;">P&amp;L</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#a1a1aa;">
        Estás a receber este email porque tens o resumo diário ativado nas definições de notificações.
      </p>
    </div>`;

  return html;
}
