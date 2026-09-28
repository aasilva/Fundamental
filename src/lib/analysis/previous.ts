import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { PreviousAnalysisContext } from "./prompt";

const PREVIOUS_ANALYSES_CONTEXT_LIMIT = 3;

// Últimas análises concluídas à mesma empresa, para o agente ou o prompt do chat compararem.
export async function loadPreviousContext(
  client: SupabaseClient<Database>,
  userId: string,
  companyKey: string,
  excludeId?: string,
): Promise<PreviousAnalysisContext[]> {
  let query = client
    .from("stock_analyses")
    .select("requested_at, sections, metrics")
    .eq("user_id", userId)
    .eq("company_key", companyKey)
    .eq("status", "completed")
    .order("requested_at", { ascending: false })
    .limit(PREVIOUS_ANALYSES_CONTEXT_LIMIT);
  if (excludeId) query = query.neq("id", excludeId);

  const { data } = await query;
  return (data ?? []).map((row) => {
    const sections = row.sections as Record<string, string | null> | null;
    return {
      requestedAt: row.requested_at,
      summary: sections?.resumo_executivo || null,
      conclusion: sections?.conclusao || null,
      metrics: row.metrics,
    };
  });
}
