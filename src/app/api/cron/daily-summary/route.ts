import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQuotesForTickers } from "@/lib/quotes";
import { computePnl, summarizePortfolio } from "@/lib/calculations";
import { renderDailySummaryEmail } from "@/lib/email/daily-summary";

export const dynamic = "force-dynamic";

const FROM_EMAIL = process.env.NOTIFICATIONS_FROM_EMAIL ?? "Fundamental <onboarding@resend.dev>";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: settings, error: settingsError } = await admin
    .from("notification_settings")
    .select("*")
    .eq("daily_summary_enabled", true);

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  const results: Array<{ user_id: string; status: string }> = [];

  for (const setting of settings ?? []) {
    const { data: holdings } = await admin
      .from("holdings")
      .select("*")
      .eq("user_id", setting.user_id);

    if (!holdings || holdings.length === 0) {
      results.push({ user_id: setting.user_id, status: "sem ações, ignorado" });
      continue;
    }

    const quotes = await getQuotesForTickers(holdings.map((h) => h.ticker));
    const withPnl = holdings.map((h) => computePnl(h, quotes[h.ticker]));
    const summary = summarizePortfolio(withPnl);
    const currency = holdings[0]?.currency ?? "EUR";
    const alertTriggered = Math.abs(summary.totalPnlPct) >= setting.alert_threshold_pct;

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(
      setting.user_id,
    );

    if (userError || !userData.user?.email) {
      results.push({ user_id: setting.user_id, status: "sem email, ignorado" });
      continue;
    }

    const html = renderDailySummaryEmail({
      holdings: withPnl,
      totalCost: summary.totalCost,
      totalValue: summary.totalValue,
      totalPnlAbs: summary.totalPnlAbs,
      totalPnlPct: summary.totalPnlPct,
      currency,
      alertTriggered,
      alertThresholdPct: setting.alert_threshold_pct,
    });

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: userData.user.email,
        subject: alertTriggered
          ? `⚠️ Alerta de carteira: variação de ${summary.totalPnlPct.toFixed(2)}%`
          : "O teu resumo diário da carteira",
        html,
      });

      await admin
        .from("notification_settings")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("user_id", setting.user_id);

      results.push({ user_id: setting.user_id, status: "enviado" });
    } catch (err) {
      results.push({ user_id: setting.user_id, status: `erro: ${(err as Error).message}` });
    }
  }

  return NextResponse.json({ results });
}
