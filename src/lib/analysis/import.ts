import { METRIC_FIELDS, SECTION_FIELDS, type AnalysisMetrics } from "./tool-schema";

// Onde a análise importada foi feita; guardado em stock_analyses.model como "import:<chave>".
export const IMPORT_SOURCES = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  other: "outra ferramenta",
} as const;

export function importSourceLabel(model: string | null): string | null {
  if (!model?.startsWith("import:")) return null;
  const key = model.slice("import:".length) as keyof typeof IMPORT_SOURCES;
  return IMPORT_SOURCES[key] ?? "outra ferramenta";
}

export type ParsedImport = {
  // Relatório sem o Resumo, a Evolução e o bloco JSON (esses são mostrados à parte).
  markdown: string;
  summary: string | null;
  evolution: string | null;
  // Mantida também no markdown; guardada à parte para servir de contexto às próximas análises.
  conclusion: string | null;
  metrics: AnalysisMetrics | null;
  identity: {
    companyName: string | null;
    ticker: string | null;
    isin: string | null;
    exchange: string | null;
  };
  missingSections: string[];
  warnings: string[];
};

function normalizeTitle(title: string) {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^[\s\d.)-]+/, "")
    .replace(/[^a-z0-9/ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Aceita números ou texto como "12,5", "1.234,5", "1,234.5", "12.5%", "18.3x".
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  let s = value.trim().replace(/[\s%xX€$£]/g, "");
  if (s === "" || /^(null|n\/?a|-|—)$/i.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    // O separador que aparece por último é o decimal; o outro é de milhares.
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const s = value.trim();
  return s === "" || /^null$/i.test(s) ? null : s;
}

const FENCE = /```[a-zA-Z]*[ \t]*\n([\s\S]*?)\n?```/g;

function extractMetricsBlock(text: string): { rest: string; data: Record<string, unknown> | null; invalid: boolean } {
  const matches = [...text.matchAll(FENCE)];
  let invalid = false;
  // O bloco de métricas vem no fim; procura do último para o primeiro.
  for (const match of matches.reverse()) {
    const body = match[1].trim();
    if (!body.startsWith("{")) continue;
    try {
      const data = JSON.parse(body) as unknown;
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const start = match.index!;
        const rest = text.slice(0, start) + text.slice(start + match[0].length);
        return { rest, data: data as Record<string, unknown>, invalid: false };
      }
    } catch {
      invalid = true;
    }
  }
  return { rest: text, data: null, invalid };
}

const HEADING = /^#{1,2}\s+(.+?)\s*#*\s*$/;

// Remove a secção cujo título normalizado seja um de `titles` e devolve o seu conteúdo.
function takeSection(markdown: string, titles: string[]): { rest: string; body: string | null } {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => {
    const m = l.match(HEADING);
    return m !== null && titles.includes(normalizeTitle(m[1]));
  });
  if (start === -1) return { rest: markdown, body: null };
  let end = start + 1;
  while (end < lines.length && !HEADING.test(lines[end])) end++;
  const body = lines.slice(start + 1, end).join("\n").trim();
  const rest = [...lines.slice(0, start), ...lines.slice(end)].join("\n");
  return { rest, body: body || null };
}

export function parseImportedAnalysis(raw: string): ParsedImport {
  const warnings: string[] = [];
  const text = raw.replace(/\r\n?/g, "\n");

  const { rest: withoutJson, data, invalid } = extractMetricsBlock(text);
  if (!data) {
    warnings.push(
      invalid
        ? "O bloco JSON de métricas tem um erro de formato — a análise foi guardada sem métricas."
        : "Não encontrei o bloco JSON de métricas no fim — a análise foi guardada sem métricas.",
    );
  }

  let metrics: AnalysisMetrics | null = null;
  if (data) {
    metrics = {
      currency: toText(data.currency)?.toUpperCase().slice(0, 3) ?? null,
      as_of: toText(data.as_of),
      ...Object.fromEntries(METRIC_FIELDS.map((m) => [m.key, toNumber(data[m.key])])),
    } as AnalysisMetrics;
    if (METRIC_FIELDS.every((m) => metrics![m.key] === null)) {
      warnings.push("O bloco de métricas não tem nenhum valor numérico preenchido.");
    }
  }

  const summaryPart = takeSection(withoutJson, ["resumo", "resumo executivo"]);
  const evolutionPart = takeSection(summaryPart.rest, [
    "evolucao desde a ultima analise",
    "evolucao desde a analise anterior",
  ]);
  const markdown = evolutionPart.rest.trim();

  const present = new Set(
    markdown
      .split("\n")
      .map((l) => l.match(HEADING))
      .filter((m): m is RegExpMatchArray => m !== null)
      .map((m) => normalizeTitle(m[1])),
  );
  const missingSections = SECTION_FIELDS.filter((s) => !present.has(normalizeTitle(s.title))).map((s) => s.title);
  if (present.size === 0) {
    warnings.push('O texto não tem títulos de secção ("## …") — foi guardado tal como está.');
  } else if (missingSections.length > 0) {
    warnings.push(`Secções em falta ou com outro título: ${missingSections.join(", ")}.`);
  }

  return {
    markdown,
    summary: summaryPart.body,
    evolution: evolutionPart.body,
    conclusion: takeSection(markdown, ["conclusao"]).body,
    metrics,
    identity: {
      companyName: data ? toText(data.empresa) : null,
      ticker: data ? toText(data.ticker) : null,
      isin: data ? toText(data.isin) : null,
      exchange: data ? toText(data.bolsa) : null,
    },
    missingSections,
    warnings,
  };
}
