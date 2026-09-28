"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Uma análise profunda demora minutos e tem custo real (pesquisa web + tokens) — evita que o
// utilizador dispare várias em paralelo sem querer.
const MAX_CONCURRENT_ANALYSES = 1;

const startSchema = z.object({
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9.\-]{1,20}$/, "Ticker inválido"),
  company_name: z.string().trim().max(200).optional().or(z.literal("")),
  isin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{0,12}$/, "ISIN inválido")
    .optional()
    .or(z.literal("")),
});

function fail(message: string): never {
  redirect(`/analysis?error=${encodeURIComponent(message)}`);
}

export async function startAnalysis(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const parsed = startSchema.safeParse({
    ticker: formData.get("ticker"),
    company_name: formData.get("company_name"),
    isin: formData.get("isin"),
  });
  if (!parsed.success) fail(parsed.error.issues.map((i) => i.message).join(", "));

  const { count } = await supabase
    .from("stock_analyses")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "running"]);

  if ((count ?? 0) >= MAX_CONCURRENT_ANALYSES) {
    fail("Já tens uma análise em curso — espera que termine (ou elimina-a) antes de iniciar outra.");
  }

  const { data: inserted, error } = await supabase
    .from("stock_analyses")
    .insert({
      ticker: parsed.data.ticker,
      company_name: parsed.data.company_name || null,
      isin: parsed.data.isin || null,
      user_id: userData.user.id,
    })
    .select("id")
    .single();

  if (error || !inserted) fail(error?.message ?? "Não foi possível criar a análise.");

  // A própria página de detalhe arranca o agente em segundo plano ao renderizar (mesmo padrão
  // do dashboard com as cotações) — não é preciso fazer nada mais aqui.
  revalidatePath("/analysis");
  redirect(`/analysis/${inserted.id}`);
}

export async function deleteAnalysis(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("stock_analyses").delete().eq("id", id);
  revalidatePath("/analysis");
}

export async function retryAnalysis(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  // Só o service_role pode alterar o estado (ver RLS); o próprio utilizador só pode pedir o retry,
  // que aqui é feito com o admin client mas sempre restrito ao dono da análise.
  const admin = createAdminClient();
  await admin
    .from("stock_analyses")
    .update({ status: "pending", error: null, run_state: null, locked_until: null })
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .eq("status", "failed");

  revalidatePath(`/analysis/${id}`);
  redirect(`/analysis/${id}`);
}
