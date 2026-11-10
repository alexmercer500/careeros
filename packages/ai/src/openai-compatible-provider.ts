import {
  AiError,
  AiValidationError,
  type GenerateRequest,
  type GenerateResult,
  type ModelRole,
  type ProviderAdapter,
} from "./provider";

export interface OpenAICompatibleConfig {
  /** Provider base URL, e.g. https://api.openai.com/v1. This is configuration, never hard-coded. */
  baseUrl: string;
  apiKey: string;
  /** Resolves a logical role to a concrete model id for this provider. */
  resolveModel: (role: ModelRole) => string;
  /** Injectable for testing; defaults to global fetch. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  id?: string;
}

interface ChatCompletionResponse {
  model?: string;
  choices?: { message?: { content?: string | null } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * Adapter for any provider exposing the OpenAI chat-completions contract.
 *
 * Deliberately dependency-free and base-URL driven: the same code works against
 * OpenAI, DeepSeek, a self-hosted gateway, or a local model server, so the product
 * is never coupled to one vendor.
 */
export class OpenAICompatibleProvider implements ProviderAdapter {
  readonly id: string;
  private readonly config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    this.config = config;
    this.id = config.id ?? "openai-compatible";
  }

  async generate<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>> {
    const startedAt = Date.now();
    const model = this.config.resolveModel(request.role);
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const url = `${this.config.baseUrl.replace(/\/+$/, "")}/chat/completions`;

    const messages: { role: "system" | "user"; content: string }[] = [];
    if (request.system) {
      messages.push({ role: "system", content: request.system });
    }
    messages.push({
      role: "user",
      content: typeof request.input === "string" ? request.input : JSON.stringify(request.input),
    });

    const body: Record<string, unknown> = {
      model,
      messages,
      response_format: { type: "json_object" },
    };
    if (request.maxOutputTokens !== undefined) body.max_tokens = request.maxOutputTokens;
    if (request.temperature !== undefined) body.temperature = request.temperature;

    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 60_000),
      });
    } catch (error) {
      throw new AiError("AI provider request failed", "provider_unreachable", { cause: error });
    }

    if (!response.ok) {
      // Never surface the API key or full request in the error message.
      throw new AiError(
        `AI provider returned HTTP ${response.status}`,
        `provider_http_${response.status}`,
      );
    }

    const payload = (await response.json().catch(() => null)) as ChatCompletionResponse | null;
    const raw = payload?.choices?.[0]?.message?.content ?? "";

    if (!raw) {
      throw new AiValidationError(
        "AI provider returned an empty completion",
        [{ path: "", message: "Empty completion" }],
        "",
      );
    }

    const json = extractJson(raw);
    if (json === null) {
      throw new AiValidationError(
        "AI completion did not contain valid JSON",
        [{ path: "", message: "Invalid JSON in completion" }],
        raw,
      );
    }

    const parsed = request.schema.safeParse(json);
    if (!parsed.success) {
      throw new AiValidationError(
        "AI completion does not satisfy the requested schema",
        parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
        raw,
      );
    }

    return {
      data: parsed.data,
      raw,
      provider: this.id,
      model: payload?.model ?? model,
      usage: {
        inputTokens: payload?.usage?.prompt_tokens ?? 0,
        outputTokens: payload?.usage?.completion_tokens ?? 0,
      },
      latencyMs: Date.now() - startedAt,
    };
  }
}

/** Accepts bare JSON or JSON wrapped in a Markdown code fence. */
export function extractJson(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  const candidate = fenced?.[1] ?? trimmed;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}
