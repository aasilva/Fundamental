import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQuotes } from "@/lib/quotes";
import { automaticPolicy } from "@/lib/quote-cache-policy";
import { computePnl, summarizeByCurrency } from "@/lib/calculations";
import { renderDailySummaryEmail } from "@/lib/email/daily-summary";

export const dynamic = "force-dynamic";
// A pesquisa AI pode demorar dezenas de segundos por ticker.
export const maxDuration = 300;

const FROM_EMAIL = process.env.NOTIFICATIONS_FROM_EMAIL ?? "Fundamental <onboarding@resend.dev>";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Sem segredo configurado o endpoint fica fechado (senão "Bearer undefined" passaria).
  if (!secret) return false;
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const resend = new Resend(process.env.RESEND_API_KEY);

  const { data: settings, error: settingsError } = await admin
    .from("user_settings")
    .select("*")
    .eq("daily_summary_enabled", true);

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }
  if (!settings || settings.length === 0) {
    return NextResponse.json({ results: [] });
  }

  const { data: allHoldings, error: holdingsError } = await admin
    .from("holdings")
    .select("*")
    .in(
      "user_id",
      settings.map((s) => s.user_id),
    );

  if (holdingsError) {
    return NextResponse.json({ error: holdingsError.message }, { status: 500 });
  }

  // Uma só ronda de cotações para todos os utilizadores (poupa pedidos à Alpha Vantage).
  const { quotes } = await getQuotes(allHoldings ?? [], {
    policy: automaticPolicy(),
    mode: "wait",
  });

  const results: Array<{ user_id: string; status: string }> = [];

  for (const setting of settings) {
    const holdings = (allHoldings ?? []).filter((h) => h.user_id === setting.user_id);

    if (holdings.length === 0) {
      results.push({ user_id: setting.user_id, status: "sem ações, ignorado" });
      continue;
    }

    const withPnl = holdings.map((h) => computePnl(h, quotes[h.ticker]));
    const summaries = summarizeByCurrency(withPnl);
    const alertTriggered = summaries.some(
      (s) => Math.abs(s.totalPnlPct) >= setting.alert_threshold_pct,
    );

    const { data: userData, error: userError } = await admin.auth.admin.getUserById(
      setting.user_id,
    );

    if (userError || !userData.user?.email) {
      results.push({ user_id: setting.user_id, status: "sem email, ignorado" });
      continue;
    }

    const { error: sendError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: userData.user.email,
      subject: alertTriggered
        ? `⚠️ Alerta: a tua carteira variou mais de ${setting.alert_threshold_pct}%`
        : "O teu resumo diário da carteira",
      html: renderDailySummaryEmail({
        holdings: withPnl,
        summaries,
        alertTriggered,
        alertThresholdPct: setting.alert_threshold_pct,
      }),
    });

    if (sendError) {
      results.push({ user_id: setting.user_id, status: `erro: ${sendError.message}` });
      continue;
    }

    await admin
      .from("user_settings")
      .update({ last_notified_at: new Date().toISOString() })
      .eq("user_id", setting.user_id);

    results.push({ user_id: setting.user_id, status: "enviado" });
  }

  return NextResponse.json({ results });
}
