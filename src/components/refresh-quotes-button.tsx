"use client";

import { useFormStatus } from "react-dom";

export function RefreshQuotesButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      title="Vai buscar agora as cotações com mais de 5 minutos"
      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      {pending ? "A atualizar…" : "↻ Atualizar cotações"}
    </button>
  );
}
