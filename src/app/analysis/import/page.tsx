import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buildChatPrompt } from "@/lib/analysis/prompt";
import { loadPreviousContext } from "@/lib/analysis/previous";
import { IMPORT_SOURCES } from "@/lib/analysis/import";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { importAnalysis } from "../actions";

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";
const cardClass =
  "mt-6 flex flex-col gap-4 rounded-xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-zinc-950";

const TICKER_PATTERN = /^[A-Z0-9.\-]{1,20}$/;

export default async function ImportAnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ ticker?: string; company_name?: string; isin?: string; error?: string }>;
}) {
  const params = await searchParams;
  const ticker = params.ticker?.trim().toUpperCase() ?? "";
  const companyName = params.company_name?.trim() ?? "";
  const isin = params.isin?.trim().toUpperCase() ?? "";
  const tickerValid = TICKER_PATTERN.test(ticker);

  let prompt: string | null = null;
  let previousCount = 0;
  if (tickerValid) {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const previous = await loadPreviousContext(supabase, userData.user!.id, ticker);
    previousCount = previous.length;
    prompt = buildChatPrompt({ ticker, companyName: companyName || null, isin: isin || null }, previous);
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Link href="/analysis" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← Todas as análises
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Importar análise do ChatGPT ou do Claude
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Usa a tua subscrição para fazer a análise no chat e guarda o resultado aqui — sem custos de API.
      </p>

      {params.error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {params.error}
        </p>
      ) : null}

      <form method="get" className={cardClass}>
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">1. Empresa</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ticker" className={labelClass}>Ticker</label>
            <input id="ticker" name="ticker" required defaultValue={ticker} placeholder="AMZN" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="company_name" className={labelClass}>Nome (opcional)</label>
            <input id="company_name" name="company_name" defaultValue={companyName} placeholder="Amazon" className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="isin" className={labelClass}>ISIN (opcional)</label>
            <input id="isin" name="isin" defaultValue={isin} placeholder="US0231351067" className={inputClass} />
          </div>
        </div>
        <div>
          <button
            type="submit"
            className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {prompt ? "Atualizar prompt" : "Gerar prompt"}
          </button>
        </div>
        {ticker && !tickerValid ? (
          <p className="text-sm text-red-600 dark:text-red-400">Ticker inválido.</p>
        ) : null}
      </form>

      {prompt ? (
        <>
          <section className={cardClass}>
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">2. Copia o prompt</h2>
              <CopyButton text={prompt} label="Copiar prompt" />
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              <li>
                Abre uma conversa nova no <strong>ChatGPT</strong> (ativa <em>Deep research</em>) ou no{" "}
                <strong>Claude</strong> (ativa <em>Research</em>).
              </li>
              <li>Cola o prompt e espera pelo relatório completo.</li>
              <li>Copia a resposta inteira, incluindo o bloco JSON de métricas no fim, e cola-a no passo 3.</li>
            </ol>
            {previousCount > 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                O prompt inclui {previousCount} análise(s) anterior(es) a {ticker}, para a IA comparar.
              </p>
            ) : null}
            <textarea
              readOnly
              value={prompt}
              rows={10}
              className={`${inputClass} font-mono text-xs`}
            />
          </section>

          <form action={importAnalysis} className={cardClass}>
            <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">3. Cola o resultado</h2>
            <input type="hidden" name="ticker" value={ticker} />
            <input type="hidden" name="company_name" value={companyName} />
            <input type="hidden" name="isin" value={isin} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="source" className={labelClass}>Feita em</label>
              <select id="source" name="source" defaultValue="chatgpt" className={inputClass}>
                {Object.entries(IMPORT_SOURCES).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="report" className={labelClass}>Relatório</label>
              <textarea
                id="report"
                name="report"
                required
                rows={14}
                placeholder="Cola aqui a resposta completa…"
                className={inputClass}
              />
            </div>
            <div>
              <SubmitButton>Guardar análise</SubmitButton>
            </div>
          </form>
        </>
      ) : null}
    </div>
  );
}
