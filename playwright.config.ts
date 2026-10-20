import { defineConfig, devices } from "@playwright/test";
import { e2ePort, fakeTermiiPort, testEnv } from "./e2e/support/env";

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
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
  webServer: [
    {
      command: "npx tsx e2e/support/fake-termii.ts",
      url: `http://127.0.0.1:${fakeTermiiPort}/health`,
      reuseExistingServer: !process.env.CI,
      env: { FAKE_TERMII_PORT: String(fakeTermiiPort) },
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
