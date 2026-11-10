import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "tests/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
