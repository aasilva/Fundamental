import type { Holding } from "@/lib/calculations";

const inputClass =
  "rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50";
const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

export function HoldingForm({
  action,
  submitLabel,
  defaultValues,
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  defaultValues?: Partial<Holding>;
}) {
  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ticker" className={labelClass}>
            Ticker
          </label>
          <input
            id="ticker"
            name="ticker"
            required
            placeholder="EDP.LS, AAPL, ..."
            defaultValue={defaultValues?.ticker ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="currency" className={labelClass}>
            Moeda
          </label>
          <input
            id="currency"
            name="currency"
            defaultValue={defaultValues?.currency ?? "EUR"}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className={labelClass}>
          Nome (opcional)
        </label>
        <input
          id="name"
          name="name"
          defaultValue={defaultValues?.name ?? ""}
          placeholder="EDP - Energias de Portugal"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quantity" className={labelClass}>
            Quantidade
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            step="any"
            min="0"
            required
            defaultValue={defaultValues?.quantity ?? ""}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entry_price" className={labelClass}>
            Preço de entrada
          </label>
          <input
            id="entry_price"
            name="entry_price"
            type="number"
            step="any"
            min="0"
            required
            defaultValue={defaultValues?.entry_price ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="entry_date" className={labelClass}>
          Data de entrada
        </label>
        <input
          id="entry_date"
          name="entry_date"
          type="date"
          required
          defaultValue={defaultValues?.entry_date ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="notes" className={labelClass}>
          Notas (opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ""}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        className="mt-2 rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {submitLabel}
      </button>
    </form>
  );
}
