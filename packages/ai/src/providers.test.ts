import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  AiError,
  AiValidationError,
  FixtureProvider,
  MockProvider,
  OpenAICompatibleProvider,
  createModelResolver,
  extractJson,
  parseModelMap,
} from "./index";

const assessmentSchema = z.object({
  score: z.number().min(0).max(100),
  skills: z.array(z.string()),
});

type Assessment = z.infer<typeof assessmentSchema>;

function baseRequest(): {
  role: "reasoning";
  promptKey: string;
  promptVersion: string;
  input: unknown;
  schema: typeof assessmentSchema;
} {
  return {
    role: "reasoning",
    promptKey: "job.matching",
    promptVersion: "1.0.0",
    input: { job: "Needs React" },
    schema: assessmentSchema,
  };
}

describe("MockProvider", () => {
  it("returns schema-valid data from a registered handler", async () => {
    const provider = new MockProvider({
      handlers: { "job.matching": { score: 82, skills: ["React"] } },
    });

    const result = await provider.generate<Assessment>(baseRequest());
    expect(result.data.score).toBe(82);
    expect(result.provider).toBe("mock");
  });

  it("prefers the versioned handler over the unversioned one", async () => {
    const provider = new MockProvider({
      handlers: {
        "job.matching": { score: 10, skills: [] },
        "job.matching@1.0.0": { score: 90, skills: ["TypeScript"] },
      },
    });

    const result = await provider.generate<Assessment>(baseRequest());
    expect(result.data.score).toBe(90);
  });

  it("rejects payloads that do not match the schema", async () => {
    const provider = new MockProvider({ handlers: { "job.matching": { score: 400 } } });
    await expect(provider.generate(baseRequest())).rejects.toBeInstanceOf(AiValidationError);
  });

  it("fails loudly when no handler is registered", async () => {
    const provider = new MockProvider({ handlers: {} });
    await expect(provider.generate(baseRequest())).rejects.toMatchObject({
      code: "mock_handler_missing",
    });
  });
});

describe("FixtureProvider", () => {
  let directory: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "careeros-fixture-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("replays a recorded response from disk", async () => {
    await writeFile(
      join(directory, "job.matching@1.0.0.json"),
      JSON.stringify({ score: 74, skills: ["React", "TypeScript"] }),
      "utf8",
    );

    const provider = new FixtureProvider({ directory });
    const result = await provider.generate<Assessment>(baseRequest());
    expect(result.data.skills).toEqual(["React", "TypeScript"]);
  });

  it("falls back to an unversioned fixture", async () => {
    await writeFile(
      join(directory, "job.matching.json"),
      JSON.stringify({ score: 60, skills: [] }),
      "utf8",
    );

    const provider = new FixtureProvider({ directory });
    const result = await provider.generate<Assessment>(baseRequest());
    expect(result.data.score).toBe(60);
  });

  it("reports a missing fixture rather than inventing a result", async () => {
    const provider = new FixtureProvider({ directory });
    await expect(provider.generate(baseRequest())).rejects.toMatchObject({
      code: "fixture_missing",
    });
  });

  it("rejects a fixture that violates the schema", async () => {
    await writeFile(join(directory, "job.matching.json"), JSON.stringify({ score: "high" }), "utf8");
    const provider = new FixtureProvider({ directory });
    await expect(provider.generate(baseRequest())).rejects.toBeInstanceOf(AiValidationError);
  });
});

describe("OpenAICompatibleProvider", () => {
  const config = {
    baseUrl: "https://provider.example/v1",
    apiKey: "test-key",
    resolveModel: () => "test-model",
  };

  it("sends an OpenAI-compatible request and parses the completion", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(
        JSON.stringify({
          model: "test-model",
          choices: [{ message: { content: '{"score":88,"skills":["React"]}' } }],
          usage: { prompt_tokens: 120, completion_tokens: 30 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as unknown as typeof fetch;

    const provider = new OpenAICompatibleProvider({ ...config, fetchImpl });
    const result = await provider.generate<Assessment>(baseRequest());

    expect(result.data).toEqual({ score: 88, skills: ["React"] });
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 30 });

    const call = calls[0];
    expect(call).toBeDefined();
    expect(call?.url).toBe("https://provider.example/v1/chat/completions");
    expect((call?.init.headers as Record<string, string>).authorization).toBe("Bearer test-key");

    const body = JSON.parse(String(call?.init.body)) as Record<string, unknown>;
    expect(body.model).toBe("test-model");
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("accepts JSON wrapped in a markdown fence", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '```json\n{"score":50,"skills":[]}\n```' } }],
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const provider = new OpenAICompatibleProvider({ ...config, fetchImpl });
    const result = await provider.generate<Assessment>(baseRequest());
    expect(result.data.score).toBe(50);
  });

  it("never leaks the api key in a failure message", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response("unauthorized", { status: 401 }),
    ) as unknown as typeof fetch;

    const provider = new OpenAICompatibleProvider({ ...config, fetchImpl });
    const error = await provider.generate(baseRequest()).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AiError);
    expect((error as AiError).code).toBe("provider_http_401");
    expect((error as Error).message).not.toContain("test-key");
  });

  it("rejects a non-JSON completion", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "sorry, I cannot" } }] }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;

    const provider = new OpenAICompatibleProvider({ ...config, fetchImpl });
    await expect(provider.generate(baseRequest())).rejects.toBeInstanceOf(AiValidationError);
  });

  it("rejects a completion that fails business shape validation", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '{"score":150}' } }] }), {
        status: 200,
      }),
    ) as unknown as typeof fetch;

    const provider = new OpenAICompatibleProvider({ ...config, fetchImpl });
    await expect(provider.generate(baseRequest())).rejects.toBeInstanceOf(AiValidationError);
  });
});

describe("model registry", () => {
  it("resolves a role from an override map", () => {
    const resolve = createModelResolver({ writing: "custom-writer" });
    expect(resolve("writing")).toBe("custom-writer");
  });

  it("falls back to the documented default", () => {
    const resolve = createModelResolver({});
    expect(resolve("reasoning")).toBe("deepseek-v4-pro");
  });

  it("parses only known roles from AI_MODEL_MAP", () => {
    const parsed = parseModelMap('{"writing":"w1","unknown_role":"x"}');
    expect(parsed).toEqual({ writing: "w1" });
  });

  it("ignores malformed configuration instead of crashing", () => {
    expect(parseModelMap("not json")).toEqual({});
  });
});

describe("extractJson", () => {
  it("parses bare JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });

  it("returns null for unparseable text", () => {
    expect(extractJson("nope")).toBeNull();
  });
});
