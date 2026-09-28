export const SUPPORTED_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "JPY", "CAD", "BRL"] as const;

export function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value);
}

export function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

// Classes Tailwind para lucro (verde), prejuízo (vermelho) ou zero.
export function pnlColor(value: number) {
  if (value > 0) return "text-emerald-600 dark:text-emerald-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return "text-zinc-500 dark:text-zinc-400";
}

// entry_date é uma data sem hora ("2024-01-15"); formatar em UTC evita mostrar o dia anterior.
export function formatDate(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("pt-PT", { timeZone: "UTC" });
}

export function formatDateTime(isoDateTime: string) {
  return new Date(isoDateTime).toLocaleString("pt-PT", {
    timeZone: "Europe/Lisbon",
    dateStyle: "short",
    timeStyle: "short",
  });
}
