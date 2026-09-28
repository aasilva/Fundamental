import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { hostname } from "@/lib/hostname";
import type { ProviderResult, QuoteProvider, QuoteRequest } from "./types";

const MODEL = process.env.QUOTE_AI_MODEL ?? "claude-opus-5";
const MAX_QUOTE_AGE_DAYS = 7;
const MAX_PAUSE_RESUMES = 3;

const SYSTEM_PROMPT = `You look up the latest market price of a listed stock using web search.

Search for the stock, then call the report_quote tool exactly once with what you found.

Rules:
- Only report a price you actually read in a search result from a financial source (the exchange's own site, Reuters, Bloomberg, Yahoo Finance, Google Finance, Investing.com, MarketWatch, Morningstar or similar). Never estimate, and never use a price you remember from training.
- source_url must be the page where you read the price.
- Report the price in the requested currency. If the source quotes a subunit of that currency (for example GBX/pence for GBP), convert to the main unit. Never convert between different currencies; if the stock only trades in another currency, report found = false.
- as_of is the date (and time, if shown) the source gives for that price, in ISO 8601.
- If you cannot identify the stock with confidence, or find no price, report found = false with price 0.`;

const reportQuoteTool: Anthropic.Beta.BetaTool = {
  name: "report_quote",
  description: "Report the stock price found through web search. Call exactly once.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      found: { type: "boolean", description: "Whether a price was found for this exact stock." },
      price: { type: "number", description: "Last traded or closing price; 0 when not found." },
      currency: { type: "string", description: "ISO 4217 code of the reported price." },
      as_of: { type: "string", description: "ISO 8601 date/time of the price per the source." },
      source_url: { type: "string", description: "URL of the page where the price was read." },
      exchange: { type: "string", description: "Exchange the price refers to." },
    },
    required: ["found", "price", "currency", "as_of", "source_url", "exchange"],
    additionalProperties: false,
  },
};

export type ReportedQuote = {
  found: boolean;
  price: number;
  currency: string;
  as_of: string;
  source_url: string;
  exchange: string;
};

function collectSearchResultHosts(content: Anthropic.Beta.BetaContentBlock[], hosts: Set<string>) {
  for (const block of content) {
    if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue;
    for (const result of block.content) {
      const host = hostname(result.url);
      if (host) hosts.add(host);
    }
  }
}

export function validateReportedQuote(
  report: ReportedQuote,
  request: QuoteRequest,
  searchHosts: Set<string>,
  now = Date.now(),
): ProviderResult {
  const reject = (detail: string): ProviderResult => ({ ok: false, reason: "not_found", detail });

  if (!report.found) return reject("AI: cotação não encontrada");
  if (!Number.isFinite(report.price) || report.price <= 0) return reject("AI: preço inválido");
  if (report.currency.toUpperCase() !== request.currency) {
    return reject(`AI: moeda ${report.currency} diferente de ${request.currency}`);
  }

  // O URL tem de vir dos resultados reais da pesquisa — protege contra fontes inventadas.
  const sourceHost = hostname(report.source_url);
  if (!sourceHost || !report.source_url.startsWith("https://") || !searchHosts.has(sourceHost)) {
    return reject("AI: fonte não corresponde aos resultados da pesquisa");
  }

  const asOf = new Date(report.as_of);
  const ageDays = (now - asOf.getTime()) / 86_400_000;
  if (Number.isNaN(asOf.getTime()) || ageDays > MAX_QUOTE_AGE_DAYS || ageDays < -1) {
    return reject(`AI: cotação desatualizada ou sem data (${report.as_of})`);
  }

  if (request.lastKnownPrice) {
    const ratio = report.price / request.lastKnownPrice;
    if (ratio < 0.5 || ratio > 2) {
      return reject(`AI: preço ${report.price} incoerente com o último conhecido ${request.lastKnownPrice}`);
    }
  }

  return {
    ok: true,
    price: report.price,
    previousClose: null,
    source: "ai_web_search",
    sourceUrl: report.source_url,
  };
}

async function fetchQuote(request: QuoteRequest): Promise<ProviderResult> {
  const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });

  const messages: Anthropic.Beta.BetaMessageParam[] = [
    {
      role: "user",
      content: [
        `Ticker: ${request.ticker}`,
        request.name ? `Company: ${request.name}` : null,
        `Requested currency: ${request.currency}`,
        `Today: ${new Date().toISOString().slice(0, 10)}`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];
  const searchHosts = new Set<string>();

  try {
    for (let attempt = 0; attempt <= MAX_PAUSE_RESUMES; attempt++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: SYSTEM_PROMPT,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }, reportQuoteTool],
        messages,
      });

      collectSearchResultHosts(response.content, searchHosts);

      if (response.stop_reason === "refusal") {
        return { ok: false, reason: "unavailable", detail: "AI: pedido recusado" };
      }

      const report = response.content.find(
        (block): block is Anthropic.Beta.BetaToolUseBlock =>
          block.type === "tool_use" && block.name === "report_quote",
      );
      if (report) {
        return validateReportedQuote(report.input as ReportedQuote, request, searchHosts);
      }

      // Turno longo de ferramentas do servidor: devolver o turno e continuar.
      if (response.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: response.content });
        continue;
      }

      return { ok: false, reason: "not_found", detail: `AI: sem resposta (${response.stop_reason})` };
    }
    return { ok: false, reason: "unavailable", detail: "AI: pesquisa não terminou" };
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError || error instanceof Anthropic.InternalServerError) {
      return { ok: false, reason: "unavailable", detail: `AI: ${error.message}` };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, reason: "unavailable", detail: `AI: erro ${error.status} ${error.message}` };
    }
    return { ok: false, reason: "unavailable", detail: `AI: ${(error as Error).message}` };
  }
}

export const aiWebSearchProvider: QuoteProvider = {
  source: "ai_web_search",
  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY) && process.env.QUOTE_AI_ENABLED === "true",
  fetchQuote,
};
