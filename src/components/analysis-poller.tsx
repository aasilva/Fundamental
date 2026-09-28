"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 6_000;
// Uma análise profunda pode demorar vários minutos (várias invocações, se necessário).
const MAX_POLLS = 80;

// Enquanto a análise estiver pendente/em curso, volta a pedir a página ao servidor — cada pedido
// à página também dá "empurrão" ao agente (ver app/analysis/[id]/page.tsx).
export function AnalysisPoller({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    let polls = 0;
    const id = setInterval(() => {
      polls += 1;
      router.refresh();
      if (polls >= MAX_POLLS) clearInterval(id);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, router]);

  return null;
}
