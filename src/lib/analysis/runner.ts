import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { hostname } from "@/lib/hostname";
import { ANALYSIS_SYSTEM_PROMPT, buildUserPrompt, type PreviousAnalysisContext } from "./prompt";
import { submitAnalysisTool, type SubmittedAnalysis } from "./tool-schema";
import { buildMarkdownReport } from "./format";
import type { Json, Tables } from "@/lib/supabase/database.types";

const MODEL = process.env.ANALYSIS_MODEL ?? "claude-opus-5";
const EFFORT = (process.env.ANALYSIS_EFFORT ?? "high") as
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";
const MAX_SEARCHES = Number(process.env.ANALYSIS_MAX_SEARCHES ?? 40);
const MAX_OUTPUT_TOKENS = Number(process.env.ANALYSIS_MAX_OUTPUT_TOKENS ?? 32000);
// Tempo reservado por invocação; deixa margem face ao maxDuration (300s) das rotas que chamam isto.
const TIME_BUDGET_MS = Number(process.env.ANALYSIS_TIME_BUDGET_MS ?? 260_000);
// Janela de reserva: se uma invocação morrer a meio, a análise fica livre para outra pegar ao fim disto.
const CLAIM_SECONDS = 300;
// Limite de turnos (pausas/retomas) por invocação, independente do tempo — evita loops sem sair do sítio.
const MAX_TURNS_PER_INVOCATION = 12;
const PREVIOUS_ANALYSES_CONTEXT_LIMIT = 3;

type Admin = ReturnType<typeof createAdminClient>;
type AnalysisRow = Tables<"stock_analyses">;
type RunState = { messages: Anthropic.Beta.BetaMessageParam[]; searchHosts: string[]; turns: number };

function collectSearchResultHosts(content: Anthropic.Beta.BetaContentBlock[], hosts: Set<string>) {
  for (const block of content) {
    if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
    for (const result of block.content) {
      const host = hostname(result.url);
      if (host) hosts.add(host);
    }
  }
}

// Nas mensagens guardadas para retomar, um tool_use cortado a meio (stop_reason "max_tokens")
// nunca teria um tool_result correspondente — a API rejeitaria o pedido seguinte. Descarta-o.
export function stripIncompleteToolUse(content: Anthropic.Beta.BetaContentBlock[]) {
  return content.filter((block) => block.type !== "tool_use");
}

async function loadPreviousContext(
  admin: Admin,
  userId: string,
  companyKey: string,
  excludeId: string,
): Promise<PreviousAnalysisContext[]> {
  const { data } = await admin
    .from("stock_analyses")
    .select("requested_at, sections, metrics")
    .eq("user_id", userId)
    .eq("company_key", companyKey)
    .eq("status", "completed")
    .neq("id", excludeId)
    .order("requested_at", { ascending: false })
    .limit(PREVIOUS_ANALYSES_CONTEXT_LIMIT);

  return (data ?? []).map((row) => {
    const sections = row.sections as Record<string, string | null> | null;
    return {
      requestedAt: row.requested_at,
      summary: sections?.resumo_executivo ?? null,
      conclusion: sections?.conclusao ?? null,
      metrics: row.metrics,
    };
  });
}

async function failAnalysis(admin: Admin, id: string, message: string) {
  console.error(`Análise ${id} falhou: ${message}`);
  await admin
    .from("stock_analyses")
    .update({ status: "failed", error: message.slice(0, 2000), run_state: null, locked_until: null })
    .eq("id", id);
}

async function finalizeAnalysis(admin: Admin, id: string, report: SubmittedAnalysis) {
  const markdown = buildMarkdownReport(report.sections, report.metrics);
  await admin
    .from("stock_analyses")
    .update({
      status: "completed",
      sections: report.sections as unknown as Json,
      metrics: report.metrics as unknown as Json,
      sources: report.sources as unknown as Json,
      report_markdown: markdown,
      company_name: report.sections.company_name_resolved,
      isin: report.sections.isin_resolved,
      completed_at: new Date().toISOString(),
      run_state: null,
      locked_until: null,
      error: null,
    })
    .eq("id", id);
}

/**
 * Corre (ou retoma) uma análise. Chamar depois de um claim_analysis bem-sucedido ter sido feito
 * por quem invoca — ver startAnalysis/nudgeAnalysis em app/analysis/actions.ts. Pode terminar sem
 * concluir a análise (orçamento de tempo esgotado): nesse caso guarda o progresso em run_state e
 * deixa o status como "running", para uma invocação seguinte continuar exatamente daí.
 */
export async function runAnalysisStep(analysisId: string): Promise<void> {
  const admin = createAdminClient();
  const invocationStart = Date.now();

  const { data: row } = await admin
    .from("stock_analyses")
    .select("*")
    .eq("id", analysisId)
    .single<AnalysisRow>();
  if (!row) return;

  try {
    await admin.from("stock_analyses").update({ status: "running", model: MODEL, effort: EFFORT }).eq("id", analysisId);

    const client = new Anthropic({ timeout: 280_000, maxRetries: 1 });

    let messages: Anthropic.Beta.BetaMessageParam[];
    let searchHosts: Set<string>;
    let turns: number;

    const state = row.run_state as unknown as RunState | null;
    if (state?.messages?.length) {
      messages = state.messages;
      searchHosts = new Set(state.searchHosts ?? []);
      turns = state.turns ?? 0;
    } else {
      const previous = await loadPreviousContext(admin, row.user_id, row.company_key, row.id);
      messages = [
        {
          role: "user",
          content: buildUserPrompt(
            { ticker: row.ticker, companyName: row.company_name, isin: row.isin },
            previous,
          ),
        },
      ];
      searchHosts = new Set();
      turns = 0;
    }

    while (Date.now() - invocationStart < TIME_BUDGET_MS && turns < MAX_TURNS_PER_INVOCATION) {
      turns += 1;

      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: EFFORT },
        system: ANALYSIS_SYSTEM_PROMPT,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }, submitAnalysisTool],
        messages,
      });
      const response = await stream.finalMessage();

      console.log(
        `Análise ${analysisId}: turno ${turns}, stop=${response.stop_reason}, ` +
          `tokens in=${response.usage.input_tokens} out=${response.usage.output_tokens}`,
      );

      collectSearchResultHosts(response.content, searchHosts);

      if (response.stop_reason === "refusal") {
        await failAnalysis(admin, analysisId, "O modelo recusou o pedido de análise (motivo de segurança).");
        return;
      }

      const submitted = response.content.find(
        (b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use" && b.name === "submit_equity_analysis",
      );
      if (submitted) {
        await finalizeAnalysis(admin, analysisId, submitted.input as SubmittedAnalysis);
        return;
      }

      if (response.stop_reason === "max_tokens") {
        messages.push({ role: "assistant", content: stripIncompleteToolUse(response.content) });
        messages.push({
          role: "user",
          content: "A resposta foi cortada por limite de tamanho. Continua e conclui a análise, chamando submit_equity_analysis assim que possível.",
        });
        continue;
      }

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason === "pause_turn") continue;

      // end_turn (ou outro) sem ter chamado a ferramenta: insiste explicitamente.
      messages.push({
        role: "user",
        content: "Por favor chama agora a ferramenta submit_equity_analysis com a análise completa.",
      });
    }

    // Orçamento de tempo (ou de turnos) esgotado sem terminar: guarda o progresso.
    // Uma invocação seguinte (ver nudgeAnalysis) retoma exatamente daqui.
    const nextState: RunState = { messages, searchHosts: [...searchHosts], turns };
    await admin
      .from("stock_analyses")
      .update({ status: "running", run_state: nextState as unknown as Json, locked_until: null })
      .eq("id", analysisId);
  } catch (error) {
    await failAnalysis(admin, analysisId, (error as Error).message);
  }
}

export async function claimAndRunAnalysisStep(analysisId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: claimed, error } = await admin.rpc("claim_analysis", {
    p_id: analysisId,
    p_claim_seconds: CLAIM_SECONDS,
  });
  if (error) {
    console.error("claim_analysis falhou:", error.message);
    return;
  }
  if (!claimed) return; // já reservada por outra invocação, ou já terminou
  await runAnalysisStep(analysisId);
}
