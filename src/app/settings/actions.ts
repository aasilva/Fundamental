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

  const { error } = await supabase
    .from("notification_settings")
    .update({
      daily_summary_enabled: dailySummaryEnabled,
      alert_threshold_pct: Number.isFinite(alertThresholdPct) ? alertThresholdPct : 5,
    })
    .eq("user_id", userData.user.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect("/settings?success=1");
}
