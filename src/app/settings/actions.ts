"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/settings?error=${encodeURIComponent(message)}`);
}

export async function updateSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const dailySummaryEnabled = formData.get("daily_summary_enabled") === "on";
  const alertThresholdPct = Number(formData.get("alert_threshold_pct"));
  const quoteRefreshMinutes = Number(formData.get("quote_refresh_minutes"));

  if (!Number.isFinite(alertThresholdPct) || alertThresholdPct < 0 || alertThresholdPct > 1000) {
    fail("O limite de alerta tem de estar entre 0 e 1000%");
  }
  if (!Number.isInteger(quoteRefreshMinutes) || quoteRefreshMinutes < 5 || quoteRefreshMinutes > 1440) {
    fail("O intervalo de atualização tem de ser um número inteiro entre 5 e 1440 minutos");
  }

  const { error } = await supabase
    .from("user_settings")
    .update({
      daily_summary_enabled: dailySummaryEnabled,
      alert_threshold_pct: alertThresholdPct,
      quote_refresh_minutes: quoteRefreshMinutes,
    })
    .eq("user_id", userData.user.id);

  if (error) fail(error.message);

  revalidatePath("/", "layout");
  redirect("/settings?success=1");
}
