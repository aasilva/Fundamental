"use client";

import { useMemo, useState } from "react";
import { GLOSSARY_CATEGORIES, type GlossaryCategory, type GlossaryTerm } from "@/lib/glossary";

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function TermCard({ term }: { term: GlossaryTerm }) {
  return (
    <article
      id={term.id}
      className="scroll-mt-24 rounded-xl border border-black/10 bg-white p-5 target:ring-2 target:ring-zinc-400 dark:border-white/10 dark:bg-zinc-950"
    >
      <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{term.en}</h3>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{term.pt}</p>
      <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{term.definition}</p>
      {term.formula ? (
        <p className="mt-3 rounded-md bg-zinc-100 px-3 py-2 font-mono text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {term.formula}
        </p>
      ) : null}
      {term.scenario ? (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            O mesmo número, duas leituras: {term.scenario.value}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
              <p className="font-medium">✓ Bom sinal</p>
              <p className="mt-1">{term.scenario.good}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              <p className="font-medium">✗ Mau sinal</p>
              <p className="mt-1">{term.scenario.bad}</p>
            </div>
          </div>
        </div>
      ) : null}
      {term.example ? (
        <p className="mt-4 border-l-2 border-zinc-300 pl-3 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Exemplo: </span>
          {term.example}
        </p>
      ) : null}
    </article>
  );
}

export function GlossaryBrowser({ terms }: { terms: GlossaryTerm[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<GlossaryCategory | "all">("all");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return terms.filter(
      (t) =>
        (category === "all" || t.category === category) &&
        (q === "" || normalize(`${t.en} ${t.pt} ${t.definition}`).includes(q)),
    );
  }, [terms, query, category]);

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-medium ${
      active
        ? "border-zinc-950 bg-zinc-950 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-950"
        : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900"
    }`;

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 mt-6 bg-zinc-50/95 px-4 py-3 backdrop-blur dark:bg-black/90">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Procurar (ex: PER, dívida, margem, dividend yield)…"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={chip(category === "all")} onClick={() => setCategory("all")}>
            Todos
          </button>
          {(Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[]).map((c) => (
            <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)}>
              {GLOSSARY_CATEGORIES[c]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">Nenhum termo encontrado.</p>
      ) : (
        (Object.keys(GLOSSARY_CATEGORIES) as GlossaryCategory[]).map((c) => {
          const inCategory = filtered.filter((t) => t.category === c);
          if (inCategory.length === 0) return null;
          return (
            <section key={c} className="mt-8">
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{GLOSSARY_CATEGORIES[c]}</h2>
              <div className="mt-3 flex flex-col gap-4">
                {inCategory.map((t) => (
                  <TermCard key={t.id} term={t} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
