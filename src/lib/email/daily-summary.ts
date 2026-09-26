import type { CurrencySummary, HoldingWithPnl } from "@/lib/calculations";
import { formatCurrency, formatPct } from "@/lib/format";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const GREEN = "#059669";
const RED = "#dc2626";
const cell = "padding:8px;border-bottom:1px solid #e5e5e5;";

function renderSummaryRow(s: CurrencySummary) {
  const color = s.totalPnlAbs >= 0 ? GREEN : RED;
  return `
    <tr>
      <td style="${cell}">${s.currency}</td>
      <td style="${cell}text-align:right;">${formatCurrency(s.totalValue, s.currency)}</td>
      <td style="${cell}text-align:right;">${formatCurrency(s.totalCost, s.currency)}</td>
      <td style="${cell}text-align:right;color:${color};font-weight:600;">${formatCurrency(s.totalPnlAbs, s.currency)} (${formatPct(s.totalPnlPct)})</td>
    </tr>`;
}

function renderHoldingRow(h: HoldingWithPnl) {
  const color = (h.pnlAbs ?? 0) >= 0 ? GREEN : RED;
  return `
    <tr>
      <td style="${cell}">${escapeHtml(h.ticker)}</td>
      <td style="${cell}text-align:right;">${h.currentPrice !== null ? formatCurrency(h.currentPrice, h.currency) : "—"}</td>
      <td style="${cell}text-align:right;">${h.currentValue !== null ? formatCurrency(h.currentValue, h.currency) : "—"}</td>
      <td style="${cell}text-align:right;color:${color};">${h.pnlAbs !== null ? `${formatCurrency(h.pnlAbs, h.currency)} (${formatPct(h.pnlPct ?? 0)})` : "—"}</td>
    </tr>`;
}

export function renderDailySummaryEmail({
  holdings,
  summaries,
  alertTriggered,
  alertThresholdPct,
}: {
  holdings: HoldingWithPnl[];
  summaries: CurrencySummary[];
  alertTriggered: boolean;
  alertThresholdPct: number;
}) {
  const alertBanner = alertTriggered
    ? `<div style="margin:16px 0;padding:12px 16px;background:#fef3c7;border-radius:8px;color:#92400e;font-size:14px;">
        A tua carteira ultrapassou o limite de ${alertThresholdPct}% de variação definido nas notificações.
      </div>`
    : "";

  const th = "padding:8px;border-bottom:1px solid #e5e5e5;";

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#18181b;">
      <h1 style="font-size:20px;">Resumo diário da carteira</h1>
      ${alertBanner}
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0;">
        <thead>
          <tr style="text-align:left;color:#71717a;">
            <th style="${th}">Moeda</th>
            <th style="${th}text-align:right;">Valor atual</th>
            <th style="${th}text-align:right;">Custo</th>
            <th style="${th}text-align:right;">Lucro / Prejuízo</th>
          </tr>
        </thead>
        <tbody>${summaries.map(renderSummaryRow).join("")}</tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="text-align:left;color:#71717a;">
            <th style="${th}">Ticker</th>
            <th style="${th}text-align:right;">Cotação</th>
            <th style="${th}text-align:right;">Valor</th>
            <th style="${th}text-align:right;">P&amp;L</th>
          </tr>
        </thead>
        <tbody>${holdings.map(renderHoldingRow).join("")}</tbody>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#a1a1aa;">
        Estás a receber este email porque tens o resumo diário ativado nas definições de notificações.
      </p>
    </div>`;
}
