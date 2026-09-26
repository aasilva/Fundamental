"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const holdingSchema = z.object({
  ticker: z.string().trim().min(1).max(20).toUpperCase(),
  name: z.string().trim().max(200).optional().or(z.literal("")),
  quantity: z.coerce.number().positive(),
  entry_price: z.coerce.number().nonnegative(),
  entry_date: z.string().min(1),
  currency: z.string().trim().min(1).max(10).default("EUR"),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

function parseForm(formData: FormData) {
  const parsed = holdingSchema.safeParse({
    ticker: formData.get("ticker"),
    name: formData.get("name"),
    quantity: formData.get("quantity"),
    entry_price: formData.get("entry_price"),
    entry_date: formData.get("entry_date"),
    currency: formData.get("currency") || "EUR",
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }

  return {
    ticker: parsed.data.ticker,
    name: parsed.data.name || null,
    quantity: parsed.data.quantity,
    entry_price: parsed.data.entry_price,
    entry_date: parsed.data.entry_date,
    currency: parsed.data.currency,
    notes: parsed.data.notes || null,
  };
}

export async function createHolding(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  let values;
  try {
    values = parseForm(formData);
  } catch (error) {
    redirect(`/holdings/new?error=${encodeURIComponent((error as Error).message)}`);
  }

  const { error } = await supabase
    .from("holdings")
    .insert({ ...values, user_id: userData.user.id });

  if (error) {
    redirect(`/holdings/new?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  redirect("/");
}

export async function updateHolding(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  let values;
  try {
    values = parseForm(formData);
  } catch (error) {
    redirect(`/holdings/${id}/edit?error=${encodeURIComponent((error as Error).message)}`);
  }

  const { error } = await supabase.from("holdings").update(values).eq("id", id);

  if (error) {
    redirect(`/holdings/${id}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/");
  redirect("/");
}

export async function deleteHolding(formData: FormData) {
  const id = formData.get("id") as string;
  const supabase = await createClient();
  await supabase.from("holdings").delete().eq("id", id);
  revalidatePath("/");
}
