/**
 * Drives the real sign-in flow (magic link captured by the local mail server)
 * and captures screenshots of the Phase 1 screens.
 *
 * Usage: node --env-file=.env.local scripts/capture-screenshots.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const APP_URL = "http://localhost:3001";
const MAIL_URL = "http://127.0.0.1:54324";
const OUT_DIR = "docs/screenshots";

const email = `careeros-demo-${Date.now()}@example.test`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findMagicLink(forEmail) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const listResponse = await fetch(`${MAIL_URL}/api/v1/messages?limit=50`);
    if (listResponse.ok) {
      const data = await listResponse.json();
      const messages = data.messages ?? [];
      const match = messages.find((message) => {
        const to = Array.isArray(message.To) ? message.To[0]?.Address : message.To;
        return String(to ?? "").toLowerCase() === forEmail.toLowerCase();
      });

      if (match) {
        const detailResponse = await fetch(`${MAIL_URL}/api/v1/message/${match.ID}`);
        if (detailResponse.ok) {
          const detail = await detailResponse.json();
          const text = decodeHtmlEntities(detail.Text ?? "");
          // Prefer our custom token_hash link; fall back to any link in the mail
          // (Supabase's default verification URL redirects to /auth/confirm?code=…).
          const tokenLink = /http:\/\/localhost:3001\/auth\/confirm\?token_hash=[^\s"'<>]+/.exec(text);
          if (tokenLink) return tokenLink[0];
          const anyLink = /http:\/\/127\.0\.0\.1:54321\/auth\/v1\/verify\?[^\s"'<>]+/.exec(text);
          if (anyLink) return anyLink[0];
        }
      }
    }
    await sleep(500);
  }
  throw new Error("Magic-link email was not received within the timeout");
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#x2F;/g, "/")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // `channel: "chromium"` uses the full Chromium build (new headless mode)
  // rather than the separate headless-shell binary.
  const browser = await chromium.launch({ channel: "chromium" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error)));

  // 1. Unauthenticated landing redirects to the login screen.
  await page.goto(APP_URL, { waitUntil: "networkidle" });
  console.log(`landing resolved to: ${new URL(page.url()).pathname}`);
  await page.screenshot({ path: `${OUT_DIR}/01-login.png`, fullPage: true });

  // 2. Request a magic link through the real form.
  await page.fill("#email", email);
  await page.getByRole("button", { name: /email me a sign-in link/i }).click();
  await page.getByText("Check your inbox").waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${OUT_DIR}/02-login-link-sent.png`, fullPage: true });

  // 3. Open the emailed link, which verifies the token server-side.
  const magicLink = await findMagicLink(email);
  console.log("received magic link: yes");
  await page.goto(magicLink, { waitUntil: "networkidle" });
  console.log(`post-verification location: ${new URL(page.url()).pathname}`);

  // 4. Overview (dashboard).
  await page.getByRole("heading", { name: "Overview" }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${OUT_DIR}/03-overview.png`, fullPage: true });

  // 5. Career profile, filled in through the UI so the form is exercised.
  await page.getByRole("link", { name: "My Career" }).click();
  await page.getByRole("heading", { name: "My Career" }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${OUT_DIR}/04-career-empty.png`, fullPage: true });

  await page.fill("#fullName", "Ratnesh Sahu");
  await page.fill("#headline", "Product-Minded Full Stack Engineer");
  await page.fill(
    "#summary",
    "Builds production web applications end to end, translating business requirements into shipped software.",
  );
  await page.fill("#city", "Pune");
  await page.fill("#currentDesignation", "Full Stack Developer");
  await page.fill("#totalExperienceMonths", "48");
  await page.fill("#noticePeriodDays", "30");
  await page.fill("#linkedinUrl", "https://www.linkedin.com/in/example");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page.getByRole("status").waitFor({ timeout: 15000 });
  console.log("profile save feedback: " + (await page.getByRole("status").innerText()));
  // Let the post-save router.refresh() finish so server-rendered values update.
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${OUT_DIR}/05-career-saved.png`, fullPage: true });

  // 6. Reload proves persistence through the database + RLS.
  await page.reload({ waitUntil: "networkidle" });
  const persistedName = await page.inputValue("#fullName");
  console.log(`persisted full name after reload: ${persistedName}`);

  // 7. A placeholder module, to show unimplemented areas are labelled.
  await page.goto(`${APP_URL}/jobs`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT_DIR}/06-jobs-placeholder.png`, fullPage: true });

  // 8. Overview now reflects the saved profile.
  await page.goto(`${APP_URL}/overview`, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${OUT_DIR}/07-overview-after-profile.png`, fullPage: true });

  await writeFile(
    `${OUT_DIR}/capture-log.txt`,
    [
      `email: ${email}`,
      `landing path: /login`,
      `post-verification path: /overview`,
      `persisted full name: ${persistedName}`,
      `console errors: ${consoleErrors.length}`,
      ...consoleErrors.map((message) => `  - ${message}`),
      "",
    ].join("\n"),
    "utf8",
  );

  await browser.close();
  console.log(`console errors captured: ${consoleErrors.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
