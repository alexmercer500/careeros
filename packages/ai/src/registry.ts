import type { ModelRole } from "./provider";

/**
 * Default role → model mapping. These are starter values, not commitments:
 * they are overridden per environment by AI_MODEL_MAP so switching providers
 * requires no code change.
 */
export const DEFAULT_MODEL_MAP: Record<ModelRole, string> = {
  bulk_extraction: "deepseek-v4-flash",
  classification: "deepseek-v4-flash",
  reasoning: "deepseek-v4-pro",
  writing: "claude-sonnet-4.6",
  strategy: "claude-opus-5.5",
};

const ROLES: ModelRole[] = [
  "bulk_extraction",
  "classification",
  "reasoning",
  "writing",
  "strategy",
];

/** Parses AI_MODEL_MAP ("{\"writing\":\"my-model\"}"), ignoring unknown roles. */
export function parseModelMap(raw: string | undefined | null): Partial<Record<ModelRole, string>> {
  if (!raw || raw.trim().length === 0) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }

  if (typeof parsed !== "object" || parsed === null) return {};

  const result: Partial<Record<ModelRole, string>> = {};
  for (const role of ROLES) {
    const value = (parsed as Record<string, unknown>)[role];
    if (typeof value === "string" && value.length > 0) {
      result[role] = value;
    }
  }
  return result;
}

export function createModelResolver(
  overrides: Partial<Record<ModelRole, string>> = {},
  fallback?: string,
) {
  return (role: ModelRole): string => overrides[role] ?? fallback ?? DEFAULT_MODEL_MAP[role];
}
