import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  // e2e/ is Playwright (npm run e2e), not Vitest.
  test: { globalSetup: ["./vitest.global-setup.ts"], testTimeout: 20000, hookTimeout: 30000, exclude: [...configDefaults.exclude, "e2e/**"] },
});
