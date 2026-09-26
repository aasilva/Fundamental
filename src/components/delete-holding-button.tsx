"use client";

import { useFormStatus } from "react-dom";

export function DeleteHoldingButton({ ticker }: { ticker: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!confirm(`Eliminar a posição ${ticker}? Esta ação não pode ser desfeita.`)) {
          event.preventDefault();
        }
      }}
      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
    >
      {pending ? "A eliminar…" : "Eliminar"}
    </button>
  );
}
