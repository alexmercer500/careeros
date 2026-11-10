/**
 * Prepares the local environment file and chooses the PostgreSQL host port.
 *
 * - Creates `.env` from scratch with generated secrets if it does not exist.
 * - Fills any missing required credential with a strong random value.
 * - Reuses the published port if our container is already running.
 * - Otherwise binds 5432, falling back to 55432, and records the choice.
 *
 * Run before `docker compose up`.
 */
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const ENV_PATH = ".env";
const CONTAINER = "careeros_postgres";
const CANDIDATES = [5432, 55432];
const REQUIRED_SECRETS = [
  "POSTGRES_ADMIN_PASSWORD",
  "CAREEROS_OWNER_PASSWORD",
  "CAREEROS_APP_PASSWORD",
];

function generateSecret() {
  return randomBytes(24).toString("base64url");
}

async function readEnvFile() {
  if (!existsSync(ENV_PATH)) return "";
  return readFile(ENV_PATH, "utf8");
}

function setVar(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return content.length === 0 || content.endsWith("\n")
    ? `${content}${line}\n`
    : `${content}\n${line}\n`;
}

function canBind(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

/** Returns { running, port } for our container, if it can be inspected. */
function inspectContainer() {
  try {
    const raw = execFileSync(
      "docker",
      ["inspect", "--format", "{{.State.Running}}|{{json .NetworkSettings.Ports}}", CONTAINER],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    const separator = raw.indexOf("|");
    if (separator === -1) return { running: false, port: null };
    const running = raw.slice(0, separator) === "true";
    const ports = JSON.parse(raw.slice(separator + 1) || "null");
    const binding = ports?.["5432/tcp"]?.[0];
    return { running, port: binding?.HostPort ? Number(binding.HostPort) : null };
  } catch {
    return { running: false, port: null };
  }
}

let content = await readEnvFile();
const created = content.length === 0;

const added = [];
for (const key of REQUIRED_SECRETS) {
  if (!new RegExp(`^${key}=.+$`, "m").test(content)) {
    content = setVar(content, key, generateSecret());
    added.push(key);
  }
}

const existing = inspectContainer();
let port;

if (existing.running && existing.port) {
  port = existing.port;
  console.log(`Container already running; keeping port ${port}.`);
} else {
  for (const candidate of CANDIDATES) {
    if (await canBind(candidate)) {
      port = candidate;
      break;
    }
    console.warn(`Port ${candidate} is in use; trying the next candidate.`);
  }
}

if (!port) {
  console.error(
    `No free port for PostgreSQL. Tried: ${CANDIDATES.join(", ")}. Stop the process using those ports and retry.`,
  );
  process.exit(1);
}

content = setVar(content, "CAREEROS_PG_PORT", String(port));
await writeFile(ENV_PATH, content, { encoding: "utf8", mode: 0o600 });

console.log(
  JSON.stringify(
    {
      envFile: created ? "created" : "updated",
      generatedSecrets: added,
      port,
      fallbackUsed: port !== CANDIDATES[0],
    },
    null,
    2,
  ),
);
