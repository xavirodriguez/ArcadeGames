import { defineConfig } from "@playwright/test";

const isCI = !!process.env.CI;
const isSmoke = process.env.E2E_SMOKE === "1" || process.env.E2E_SMOKE === "true";

export default defineConfig({
  testDir: "./e2e",
  // Smoke stays short; full suite keeps the previous headroom.
  timeout: isSmoke ? 20_000 : 30_000,
  retries: 0,
  // Sequential gameplay routes share one Expo web server; keep workers low.
  workers: isCI ? (isSmoke ? 1 : 2) : 1,
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:8081",
    headless: true,
    viewport: { width: 1280, height: 720 },
    // Avoid expensive traces/screenshots unless a test fails.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command:
      'NODE_OPTIONS="--max-old-space-size=4096" EXPO_PUBLIC_E2E_HOOKS=true npx expo start --web --port 8081',
    url: "http://localhost:8081",
    reuseExistingServer: !isCI,
    // Expo cold start is the dominant cost; keep enough headroom but fail earlier than before.
    timeout: isSmoke ? 90_000 : 120_000,
  },
});
