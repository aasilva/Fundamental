import Link from "next/link";
import { METRIC_GLOSSARY } from "@/lib/glossary";

// Nome da métrica com link para a explicação no glossário.
export function MetricLabel({ metricKey, title }: { metricKey: string; title: string }) {
  const glossaryId = METRIC_GLOSSARY[metricKey];
  if (!glossaryId) return <>{title}</>;
  return (
    <Link
      href={`/glossary#${glossaryId}`}
      title="Ver no glossário"
      className="underline decoration-dotted underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-50"
    >
      {title}
    </Link>
  );
}
