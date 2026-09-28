"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 8_000;
// A pesquisa AI pode demorar ~1 min; depois disso deixa de insistir.
const MAX_POLLS = 15;

// Enquanto houver cotações a atualizar em segundo plano, volta a pedir a página ao servidor.
export function QuoteRefreshPoller({ count }: { count: number }) {
  const router = useRouter();

  useEffect(() => {
    if (count === 0) return;
    let polls = 0;
    const id = setInterval(() => {
      polls += 1;
      router.refresh();
      if (polls >= MAX_POLLS) clearInterval(id);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [count, router]);

  if (count === 0) return null;

  return (
    <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
      {count === 1 ? "A atualizar 1 cotação" : `A atualizar ${count} cotações`} em segundo plano…
    </p>
  );
}
