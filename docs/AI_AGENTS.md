# CareerOS — AI Architecture and Agent Contracts

**Status:** Phase 0 proposal — awaiting owner approval
**Depends on:** `ENVIRONMENT_AUDIT.md §4` (verified provider reality), `SECURITY.md §11`

---

## 1. Requirement from the spec

- Provider-independent. DeepSeek, Claude, and OpenAI are interchangeable.
- Specialised agents with narrow responsibilities.
- Structured output, schema validation, business-rule validation, then user review.
- Versioned prompts, complete run logging, no unrestricted database access.
- AI must never promote an unverified fact to verified.

All of that is preserved below. What changes is the *default transport*, because the environment does
not match the spec's assumption.

---

## 2. Verified provider reality (this drives the design)

| Assumption in the spec | What was actually verified |
|---|---|
| Three first-party provider APIs | Only **one** credential exists, for an **OpenAI-compatible aggregator** (`tokenharbor.ai`) |
| Native Anthropic / DeepSeek clients | `POST {ANTHROPIC_BASE_URL}/v1/messages` → **404**. The gateway exposes only `/v1/chat/completions` |
| Model names are vendor names | Gateway model IDs are **aliases** (`deepseek-v4-pro`, `claude-sonnet-4.6`, `claude-opus-5.5`, `gpt-6-luna`, `gemini-3.8-flash`, `qwen3.8-max`, `glm-5.3`, `mistral-large-2512`) |
| Calls work today | **HTTP 402** — no active plan / insufficient balance. Zero completions succeed |

Consequences, which the spec should absorb:

1. **The default adapter is OpenAI-compatible**, not a vendor SDK. This is also the most portable
   choice: it works with OpenAI, DeepSeek's own API, vLLM, Ollama, OpenRouter, and this gateway.
2. **Model IDs are configuration, never code.** They live in a registry with logical role names.
3. **Native adapters are optional plugins**, enabled by config, for when first-party keys exist.
4. **No AI feature can be demonstrated until billing is resolved** (decision **D2**). The design
   therefore makes the AI layer testable offline with recorded fixtures — otherwise Phase 3 would be
   blocked entirely rather than merely deferred.

---

## 3. Provider abstraction

```ts
// packages/ai/src/providers/types.ts
export type ModelRole =
  | "bulk_extraction"   // cheap, high volume
  | "classification"    // cheap, short output
  | "reasoning"         // scoring rationale, gap analysis
  | "writing"           // resumes, cover letters, positioning
  | "strategy";         // career recommendations, comparisons

export interface GenerateArgs<T> {
  role: ModelRole;
  promptKey: string;
  promptVersion: string;
  input: unknown;
  schema: ZodType<T>;
  maxOutputTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export interface ProviderAdapter {
  readonly id: "openai-compatible" | "openai" | "anthropic" | "deepseek";
  supports(model: string): boolean;
  generate<T>(args: GenerateArgs<T>): Promise<{
    data: T;
    raw: string;
    usage: { inputTokens: number; outputTokens: number };
    model: string;
    latencyMs: number;
  }>;
}

export interface ModelRegistry {
  resolve(role: ModelRole): { adapterId: string; model: string; fallback?: string };
}
```

- One adapter is active by default: `openai-compatible`, configured by `AI_BASE_URL`,
  `AI_API_KEY`, and `AI_MODEL_MAP`.
- `generate()` never returns unvalidated data. Schema parsing happens inside the adapter contract so
  no caller can forget it.
- `AI_MODEL_MAP` (JSON or env) overrides the registry per environment, so switching to first-party
  providers is a deployment change.

### 3.1 Default model registry (role → model, all configurable)

| Role | Default alias | Cheaper fallback | Rationale |
|---|---|---|---|
| `bulk_extraction` | `deepseek-v4-flash` | `gemini-3.8-flash` | High volume job parsing; cost-sensitive |
| `classification` | `deepseek-v4-flash` | `glm-5.3-flash` | Email triage, short labels |
| `reasoning` | `deepseek-v4-pro` | `claude-sonnet-4.6` | Match explanations, gap analysis |
| `writing` | `claude-sonnet-4.6` | `claude-sonnet-5` | Resume and cover-letter quality |
| `strategy` | `claude-opus-5.5` | `gpt-6-luna` | Career strategy, cross-application analysis |

Verified-available aliases, subject to change by the gateway. If a role's model is unavailable, the
resolver falls back to the provider's default and records the substitution in `ai_runs`.

### 3.2 What is *not* delegated to the model

Deterministic logic stays in TypeScript, because a model that can drift must not decide anything the
product testifies to:

- the weighted match score and its band,
- hard-requirement pass/fail,
- whether an achievement may appear on a resume,
- approval validity,
- any status transition.

The model extracts evidence and writes prose. Code computes verdicts.

---

## 4. Model routing and cost controls

- `AI_ENABLED` kill switch — when false, all AI features return a clear "AI unavailable" state and
  the rest of the product keeps working. Nothing hard-depends on AI except matching and generation,
  which degrade to "manual" mode.
- Per-task token ceilings (`maxOutputTokens`) and per-run timeout (60 s default, 180 s for writing).
- Per-workspace daily budget in `ai_runs` cost aggregation; exceeding it disables generation (not
  viewing) and surfaces a warning.
- Retries: at most 2, only on transport/5xx errors, never on validation failure (a schema failure is a
  prompt bug, not a transient error — retrying burns money and hides the defect).
- No silent model substitution: every substitution is recorded on the `ai_runs` row.

---

## 5. Agent contracts

Each agent has: a narrow purpose, a typed input assembled from **verified** facts only, a Zod output
schema, post-schema business rules, and a persistence target.

| Agent | Purpose | Role | Output schema (shape) | Writes to |
|---|---|---|---|---|
| `CareerProfileAgent` | Parse an uploaded resume into proposed profile facts; flag conflicts with the existing profile | `reasoning` | `{ facts: ProposedFact[], conflicts: Conflict[], missing: string[] }` | **Nothing directly** — returns proposals the user confirms |
| `JobExtractionAgent` | Extract structured requirements from a job description | `bulk_extraction` | `{ title, company, location, workMode, employmentType, experienceMin, experienceMax, skills, responsibilities, requirements[{label,isHard,minYears}], compensation, postedAt }` | `jobs`, `job_requirements` |
| `JobMatchingAgent` | Produce evidence per rubric dimension; explain fit | `reasoning` | `{ dimensions: {skills, experience, responsibilities, seniority, domain, logistics}, matchingSkills[], missingSkills[], gaps[], hardFailures[], reasonsFor[], reasonsAgainst[], confidence }` | `match_assessments` (score computed in code) |
| `CareerStrategistAgent` | Positioning and improvement recommendations across applications | `strategy` | `{ recommendations[], evidenceRefs[], sampleSizeWarnings[] }` | response only |
| `ResumeAgent` | Select and phrase bullets for a target job from verified achievements | `writing` | `{ sections[], claims[{text, factType, factId}] }` | `document_versions`, `document_claims` |
| `CoverLetterAgent` | Write a cover letter grounded in verified facts | `writing` | `{ body, claims[{text, factType, factId}] }` | `document_versions`, `document_claims` |
| `ApplicationAssistantAgent` | Map form fields to profile values; flag unknowns | `reasoning` | `{ mappings[{field, value, sourceFactId, confidence}], unknownFields[], sensitiveFields[] }` | `automation_runs.steps` |
| `EmailMonitoringAgent` | Classify a message and propose an application link | `classification` | `{ classification, confidence, applicationId?, matchConfidence, needsReview }` | `email_events` |
| `CareerAnalyticsAgent` | Explain measured funnel data; no causal claims on small samples | `strategy` | `{ findings[], caveats[], recommendedActions[] }` | response only |

### 5.1 Rules common to all agents

1. **Input is assembled, not fetched by the model.** A service builds a bounded context object from
   the DB, applies the data-classification policy, and passes only that.
2. **Only `verified` / `user_confirmed` facts may be cited.** `needs_evidence` facts are excluded
   from resume and cover-letter context, so they cannot be written about at all.
3. **Every claim carries a `factId`.** Validation rejects unknown IDs, and rejects IDs whose
   `verification` is not approved. This makes fabrication a hard failure, not a review note.
4. **The model never sees another workspace's data.** Context assembly is workspace-scoped and
   asserted before the call.
5. **Sensitive or legal questions are never answered by the model.** They are surfaced as
   `sensitiveFields` for the user.

---

## 6. Execution pipeline

```
1  input            typed request from a core service or worker
2  context          workspace-scoped fact assembly + classification filter
3  prompt           prompt_key + prompt_version resolved from the registry
4  routing          role → (adapter, model, fallback)
5  generate         adapter call, structured output requested, timeout + token cap
6  schema           Zod parse — hard fail on mismatch
7  business rules   determinism checks, fact-ID resolution, band gating, policy checks
8  review           required for generation, matching explanations, and profile facts
9  persistence      versioned write + ai_runs record (provider, model, tokens, cost, outcome)
10 audit            consequential results logged with correlation ID
```

Steps 6 and 7 are separate on purpose. A model can return perfectly valid JSON that is factually
disallowed (a claim pointing at an unverified achievement). Schema validation catches shape; the
business rules catch meaning.

---

## 7. Prompt registry

```text
packages/ai/src/prompts/
  job-extraction/
    v1.ts            // { key: "job.extraction", version: "1.0.0", system, user(ctx) }
    v2.ts
  job-matching/
    v1.ts
  resume-generation/
    v1.ts
  ...
```

- Prompts are code, versioned in git, never edited in place once used in production — a change is a
  new version file.
- Every `ai_runs` row records `prompt_key`, `prompt_version`, `input_hash`, and `model`.
- An assessment is reproducible in principle: same facts + same `weights_version` +
  same `prompt_version` + same model family. Determinism is not guaranteed at the token level, which
  is why **the score itself is computed in code** and only the evidence is model-derived.
- Prompt changes require a fixture test showing the output schema still validates and a
  prompt-injection test still passes.

---

## 8. Match scoring specification (deterministic)

The spec's weights, implemented in `packages/core/src/matching/score.ts`:

| Dimension | Weight | Source |
|---|---|---|
| Technical skills | 25% | Required skills from `job_requirements` vs verified profile skills (+ years) |
| Relevant experience | 20% | Years in comparable roles/technologies |
| Responsibilities and ownership | 20% | Extracted responsibility labels vs achievement/experience evidence, including ownership scope |
| Seniority alignment | 15% | Target seniority vs role seniority signals |
| Domain fit | 10% | Industry/domain overlap |
| Location and compensation | 10% | Preferences vs job facts |

```
overall = Σ (dimension_score × weight)          // 0..100, one decimal
band    = overall >= 85 ? "excellent"
        : overall >= 70 ? "strong"
        : overall >= 55 ? "possible"
        : "low_priority"

if (hardRequirementFailures.length > 0) band = min(band, "possible")   // hard gate
```

Non-negotiable properties, each covered by a unit test:
- weights sum to 1.0 and are versioned (`weights_version`),
- the model cannot return `overall_score` — it returns dimension evidence and the code computes it,
- with a hard failure present, the band can never be `excellent` or `strong` (also enforced by the
  DB check constraint),
- a missing dimension degrades to an explicit `unknown` score with a stated penalty, never silently
  to zero or a full score.

---

## 9. Logging and observability

Every AI call writes an `ai_runs` row:

```json
{
  "agent": "JobMatchingAgent",
  "task": "job.match",
  "provider": "openai-compatible",
  "model": "deepseek-v4-pro",
  "prompt_key": "job.matching",
  "prompt_version": "1.0.0",
  "input_hash": "sha256:…",
  "input_tokens": 3184,
  "output_tokens": 812,
  "estimated_cost_usd": 0.00127,
  "duration_ms": 4310,
  "status": "rejected_by_validation",
  "validation": { "schema": "failed", "errors": ["claims[2].factId: unknown"] }
}
```

Dashboard needs (Phase 6): cost per agent, validation-failure rate, p95 latency, fallback rate,
tokens per document. Validation-failure rate is the primary quality signal — a rising rate means a
prompt regression, not model variance.

---

## 10. Failure modes and degradation

| Failure | Behaviour |
|---|---|
| Provider 402 / 401 / quota | AI features disabled with a clear banner; manual workflows remain fully usable |
| Provider 5xx / timeout | 2 retries with backoff, then mark `ai_runs.status = failed`; job matching can be retried from the UI |
| Schema validation failure | No retry (prompt defect), `rejected_by_validation`, surfaced for developer inspection |
| Business-rule failure (unknown fact, unverified fact, hard gate) | Run fails with an actionable reason; nothing is persisted as an assessment or document |
| Hallucinated employer/metric | Caught by claim validation and the `achievements_approval_chk` / metric-evidence constraints |
| Gateway model alias removed | Resolver falls back; substitution recorded; alert if the default was used |
| Cost ceiling reached | Generation disabled for the workspace; data remains readable |

---

## 11. Testing strategy for AI

1. **Fixture replay** — recorded provider responses stored as JSON; the adapter is stubbed in tests.
   This lets Phases 3–5 be developed and tested while the provider is unfunded.
2. **Schema tests** — every agent's schema has pass/fail cases, including malformed and
   over-permissive model output.
3. **Business-rule tests** — unverified fact IDs, missing evidence, hard-requirement mismatches,
   invalid score bands.
4. **Injection tests** — job text and email bodies containing instructions must not alter scores,
   statuses, or claims.
5. **Determinism tests** — the same extracted evidence produces the same weighted score to the
   decimal, across runs.
6. **Budget tests** — a workspace at its daily cap cannot start a new generation.
7. **Live smoke tests** — a single, explicitly-flagged test hits the real provider, skipped by
   default and only run when `AI_LIVE_TEST=1` and a key is funded. This is how "never claim an
   integration works without testing it" is honoured without making CI depend on a paid account.

---

## 12. Open decisions

| ID | Decision | Blocks |
|---|---|---|
| D2 | Fund the gateway, or supply first-party OpenAI/Anthropic/DeepSeek keys | Any live AI feature; Phase 3 match, Phase 4 generation |
| D5 | Which role maps to which model (cost vs quality) | Tuning only, defaults proposed in §3.1 |
| D10 | May email bodies leave the network? | Email classification quality vs privacy |
| D15 | Local embedding model for semantic matching/dedupe? | Optional; keyword + trigram is sufficient for MVP |
