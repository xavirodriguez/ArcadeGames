import { defineConfig } from "@playwright/test";

const useDevServer = process.env.E2E_DEV_SERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  timeout: process.env.CI ? 60000 : 30000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:8081",
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: useDevServer
      ? "NODE_OPTIONS=\"--max-old-space-size=8192\" EXPO_PUBLIC_E2E_HOOKS=true npx expo start --web --port 8081"
      : "node scripts/serve-e2e.mjs --port 8081",
    url: "http://localhost:8081",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
