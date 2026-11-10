import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { AiError, AiValidationError, type GenerateRequest, type GenerateResult, type ProviderAdapter } from "./provider";

export interface FixtureProviderOptions {
  directory: string;
  id?: string;
}

/**
 * Replays recorded provider responses from disk. Names are
 * `<promptKey>@<promptVersion>.json`, falling back to `<promptKey>.json`.
 *
 * This is how the AI layer stays developable and testable without a funded
 * provider account, and it is what makes prompt regressions reviewable as diffs.
 */
export class FixtureProvider implements ProviderAdapter {
  readonly id: string;
  private readonly directory: string;

  constructor(options: FixtureProviderOptions) {
    this.id = options.id ?? "fixture";
    this.directory = options.directory;
  }

  async generate<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>> {
    const startedAt = Date.now();
    const candidates = [
      `${request.promptKey}@${request.promptVersion}.json`,
      `${request.promptKey}.json`,
    ];

    let raw: string | null = null;
    for (const candidate of candidates) {
      try {
        raw = await readFile(join(this.directory, candidate), "utf8");
        break;
      } catch {
        // try the next candidate
      }
    }

    if (raw === null) {
      throw new AiError(
        `No fixture found for prompt "${request.promptKey}" in ${this.directory}`,
        "fixture_missing",
      );
    }

    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new AiValidationError(
        "Fixture is not valid JSON",
        [{ path: "", message: "Invalid JSON" }],
        raw,
      );
    }

    const parsed = request.schema.safeParse(value);
    if (!parsed.success) {
      throw new AiValidationError(
        "Fixture does not satisfy the requested schema",
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
      model: "fixture",
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: Date.now() - startedAt,
    };
  }
}
