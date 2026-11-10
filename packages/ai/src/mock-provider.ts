import { AiError, AiValidationError, type GenerateRequest, type GenerateResult, type ProviderAdapter } from "./provider";

export interface MockProviderOptions {
  /**
   * Either a canned payload or a function producing one, keyed by
   * `"<promptKey>@<promptVersion>"` or by `"<promptKey>"`.
   */
  handlers: Record<string, unknown | ((input: unknown) => unknown)>;
  id?: string;
}

/** Deterministic in-process provider used by tests and offline development. */
export class MockProvider implements ProviderAdapter {
  readonly id: string;
  private readonly handlers: MockProviderOptions["handlers"];

  constructor(options: MockProviderOptions) {
    this.id = options.id ?? "mock";
    this.handlers = options.handlers;
  }

  async generate<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>> {
    const startedAt = Date.now();
    const handler =
      this.handlers[`${request.promptKey}@${request.promptVersion}`] ??
      this.handlers[request.promptKey];

    if (handler === undefined) {
      throw new AiError(
        `No mock handler registered for prompt "${request.promptKey}"`,
        "mock_handler_missing",
      );
    }

    const value = typeof handler === "function" ? handler(request.input) : handler;
    const raw = JSON.stringify(value);
    const parsed = request.schema.safeParse(value);

    if (!parsed.success) {
      throw new AiValidationError(
        "Mock payload does not satisfy the requested schema",
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
      model: "mock",
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: Date.now() - startedAt,
    };
  }
}
