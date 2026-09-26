import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateNotificationSettings } from "./actions";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", userData.user!.id)
    .single();

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Notificações
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Resumos por email e alertas de variação da carteira.
      </p>

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

      <form action={updateNotificationSettings} className="mt-6 flex flex-col gap-5">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            name="daily_summary_enabled"
            defaultChecked={settings?.daily_summary_enabled ?? true}
            className="h-4 w-4"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Receber resumo diário por email
          </span>
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
            defaultValue={settings?.alert_threshold_pct ?? 5}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Aplica-se tanto a lucros como a prejuízos (ex: 5% avisa em +5% ou -5%).
          </p>
        </div>

        <button
          type="submit"
          className="mt-2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Guardar
        </button>
      </form>
    </div>
  );
}
