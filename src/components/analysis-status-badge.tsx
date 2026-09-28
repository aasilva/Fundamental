const LABELS: Record<string, string> = {
  pending: "Em fila",
  running: "A analisar…",
  completed: "Concluída",
  failed: "Falhou",
};

const CLASSES: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  running: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function AnalysisStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${CLASSES[status] ?? CLASSES.pending}`}
    >
      {(status === "pending" || status === "running") && (
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
      )}
      {LABELS[status] ?? status}
    </span>
  );
}
