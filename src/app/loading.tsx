export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
        ))}
      </div>
      <div className="mt-8 h-64 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">A carregar…</p>
    </div>
  );
}
