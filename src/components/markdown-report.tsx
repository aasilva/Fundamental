import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

// Conteúdo gerado por IA a partir de pesquisa web: nunca é HTML de confiança. O react-markdown
// escapa HTML em vez de o interpretar, por isso isto é seguro mesmo que uma página pesquisada
// tenha tentado injetar marcação.
const components: Components = {
  h2: (props) => <h2 className="mt-8 text-lg font-semibold text-zinc-950 dark:text-zinc-50" {...props} />,
  h3: (props) => <h3 className="mt-5 text-base font-semibold text-zinc-950 dark:text-zinc-50" {...props} />,
  p: (props) => <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300" {...props} />,
  ul: (props) => <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300" {...props} />,
  ol: (props) => <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300" {...props} />,
  strong: (props) => <strong className="font-semibold text-zinc-950 dark:text-zinc-50" {...props} />,
  a: (props) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer"
      className="text-zinc-950 underline hover:no-underline dark:text-zinc-50"
    />
  ),
  table: (props) => (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-left text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="border-b border-black/10 px-2 py-1.5 font-medium text-zinc-500 dark:border-white/10 dark:text-zinc-400" {...props} />
  ),
  td: (props) => <td className="border-b border-black/5 px-2 py-1.5 dark:border-white/5" {...props} />,
};

export function MarkdownReport({ content }: { content: string }) {
  return (
    <div className="min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
