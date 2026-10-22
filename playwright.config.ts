import { defineConfig, devices } from "@playwright/test";
import { e2ePort, fakePaystackPort, fakeResendPort, paystackTestSecret, testEnv } from "./e2e/support/env";

const baseURL = `http://localhost:${e2ePort}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? "github" : "list",
  globalSetup: "./e2e/support/global-setup.ts",
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", testIgnore: "**/jobs.spec.ts", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", testIgnore: "**/jobs.spec.ts", use: { ...devices["Pixel 7"], channel: "chrome" } },
    { name: "jobs", testMatch: "**/jobs.spec.ts", dependencies: ["desktop", "mobile"], use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
  webServer: [
    {
      command: "npx tsx e2e/support/fake-resend.ts",
      url: `http://127.0.0.1:${fakeResendPort}/health`,
      reuseExistingServer: !process.env.CI,
      env: { FAKE_RESEND_PORT: String(fakeResendPort) },
    },
    {
      command: "npx tsx e2e/support/fake-paystack.ts",
      url: `http://127.0.0.1:${fakePaystackPort}/health`,
      reuseExistingServer: !process.env.CI,
      env: {
        FAKE_PAYSTACK_PORT: String(fakePaystackPort),
        PAYSTACK_SECRET_KEY: paystackTestSecret,
        APP_WEBHOOK_URL: `${baseURL}/api/webhooks/paystack`,
      },
    },
    {
      command: `npm run build && npm run start -- -p ${e2ePort}`,
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: { ...testEnv },
    },
  ],
});
