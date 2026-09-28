"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getQuotes } from "@/lib/quotes";
import { MANUAL_POLICY } from "@/lib/quote-cache-policy";

export async function refreshQuotesNow() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: holdings } = await supabase.from("holdings").select("ticker, name, currency");
  const { refreshed, refreshing } = await getQuotes(holdings ?? [], {
    policy: MANUAL_POLICY,
    mode: "wait",
  });

  revalidatePath("/");
  redirect(`/?atualizadas=${refreshed.length}&em_curso=${refreshing.length}`);
}
