import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateHolding } from "../../actions";
import { HoldingForm } from "../../holding-form";

export default async function EditHoldingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data: holding } = await supabase
    .from("holdings")
    .select("*")
    .eq("id", id)
    .single();

  if (!holding) notFound();

  const updateWithId = updateHolding.bind(null, id);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <Link href="/holdings" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
        ← As minhas ações
      </Link>
      <h1 className="mt-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Editar {holding.ticker}
      </h1>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <HoldingForm action={updateWithId} submitLabel="Guardar alterações" defaultValues={holding} />
    </div>
  );
}
