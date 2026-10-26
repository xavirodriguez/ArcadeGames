import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: "http://localhost:8081",
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: {
    command: "EXPO_PUBLIC_E2E_HOOKS=true npx expo start --web --port 8081",
    url: "http://localhost:8081",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
