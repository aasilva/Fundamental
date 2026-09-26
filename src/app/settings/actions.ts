"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateNotificationSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const dailySummaryEnabled = formData.get("daily_summary_enabled") === "on";
  const alertThresholdPct = Number(formData.get("alert_threshold_pct"));

  if (!Number.isFinite(alertThresholdPct) || alertThresholdPct < 0 || alertThresholdPct > 1000) {
    redirect(`/settings?error=${encodeURIComponent("O limite tem de estar entre 0 e 1000%")}`);
  }

  const { error } = await supabase
    .from("notification_settings")
    .update({
      daily_summary_enabled: dailySummaryEnabled,
      alert_threshold_pct: alertThresholdPct,
    })
    .eq("user_id", userData.user.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect("/settings?success=1");
}
