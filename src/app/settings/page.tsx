import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/submit-button";
import { updateSettings } from "./actions";

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
const hintClass = "text-xs text-zinc-500 dark:text-zinc-400";
const sectionTitleClass = "text-sm font-semibold text-zinc-950 dark:text-zinc-50";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userData.user!.id)
    .single();

  const aiMinimumMinutes = Number(process.env.QUOTE_AI_CACHE_TTL_MINUTES ?? 360);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Definições</h1>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          Preferências guardadas.
        </p>
      ) : null}

      <form action={updateSettings} className="mt-6 flex flex-col gap-8">
        <section className="flex flex-col gap-3">
          <h2 className={sectionTitleClass}>Cotações</h2>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quote_refresh_minutes" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Atualizar cotações automaticamente a cada (minutos)
            </label>
            <input
              id="quote_refresh_minutes"
              name="quote_refresh_minutes"
              type="number"
              step="1"
              min="5"
              max="1440"
              required
              defaultValue={settings?.quote_refresh_minutes ?? 60}
              className={inputClass}
            />
            <p className={hintClass}>
              Entre 5 e 1440 minutos. Até lá, o dashboard mostra o último valor guardado sem pedir nada às
              APIs. Cotações obtidas por pesquisa AI (com custo) só são atualizadas automaticamente a cada{" "}
              {aiMinimumMinutes} minutos, no mínimo. O botão &quot;Atualizar cotações&quot; no dashboard
              ignora este intervalo.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className={sectionTitleClass}>Notificações por email</h2>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              name="daily_summary_enabled"
              defaultChecked={settings?.daily_summary_enabled ?? true}
              className="h-4 w-4"
            />
            <span className="text-sm text-zinc-700 dark:text-zinc-300">Receber resumo diário por email</span>
          </label>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="alert_threshold_pct" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Alertar quando a variação da carteira ultrapassar (%)
            </label>
            <input
              id="alert_threshold_pct"
              name="alert_threshold_pct"
              type="number"
              step="0.1"
              min="0"
              max="1000"
              defaultValue={settings?.alert_threshold_pct ?? 5}
              className={inputClass}
            />
            <p className={hintClass}>Aplica-se tanto a lucros como a prejuízos (ex: 5% avisa em +5% ou -5%).</p>
          </div>
        </section>

        <SubmitButton>Guardar</SubmitButton>
      </form>
    </div>
  );
}
