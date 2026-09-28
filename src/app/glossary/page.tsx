import { GLOSSARY } from "@/lib/glossary";
import { GlossaryBrowser } from "@/components/glossary-browser";

export const metadata = { title: "Glossário — Fundamental" };

export default function GlossaryPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Glossário financeiro</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        {GLOSSARY.length} termos de análise de ações, em inglês (como aparecem nos relatórios e sites
        financeiros) com o equivalente em português. Em muitos termos, o mesmo número é comparado em duas
        empresas diferentes — porque um múltiplo só é bom ou mau no contexto do negócio.
      </p>
      <GlossaryBrowser terms={GLOSSARY} />
      <p className="mt-10 text-xs text-zinc-500 dark:text-zinc-400">
        Os exemplos usam empresas-tipo e valores de referência aproximados, para ilustrar o raciocínio. Não são
        recomendações de investimento.
      </p>
    </div>
  );
}
