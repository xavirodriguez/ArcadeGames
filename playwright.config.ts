import { defineConfig } from "@playwright/test";

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
    command: "NODE_OPTIONS=\"--max-old-space-size=8192\" EXPO_PUBLIC_E2E_HOOKS=true npx expo start --web --port 8081",
    url: "http://localhost:8081",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
