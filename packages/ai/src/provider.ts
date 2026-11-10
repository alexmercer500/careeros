import type { ZodType } from "zod";

/** Logical capability a caller asks for, independent of any specific vendor. */
export type ModelRole =
  | "bulk_extraction"
  | "classification"
  | "reasoning"
  | "writing"
  | "strategy";

export interface GenerateRequest<T> {
  role: ModelRole;
  promptKey: string;
  promptVersion: string;
  input: unknown;
  schema: ZodType<T>;
  system?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface GenerateUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateResult<T> {
  data: T;
  raw: string;
  provider: string;
  model: string;
  usage: GenerateUsage;
  latencyMs: number;
}

export interface ProviderAdapter {
  readonly id: string;
  generate<T>(request: GenerateRequest<T>): Promise<GenerateResult<T>>;
}

export class AiError extends Error {
  readonly code: string;

  constructor(message: string, code: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = new.target.name;
    this.code = code;
  }
}

export interface AiIssue {
  path: string;
  message: string;
}

/**
 * Raised when a provider returns something that is not valid JSON, or valid JSON
 * that does not satisfy the requested schema. This is never retried automatically:
 * a schema failure is a prompt/contract defect, not a transient error.
 */
export class AiValidationError extends AiError {
  readonly issues: AiIssue[];
  readonly raw: string;

  constructor(message: string, issues: AiIssue[], raw: string) {
    super(message, "ai_validation_failed");
    this.issues = issues;
    this.raw = raw;
  }
}
