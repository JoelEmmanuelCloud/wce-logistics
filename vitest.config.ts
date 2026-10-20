import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/support/server-only.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    env: {
      AUTH_SECRET: "unit-test-secret-unit-test-secret-0000",
      DATA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
      DATABASE_URL: "postgres://unit:test@127.0.0.1:1/unit",
      EMAIL_PROVIDER: "log",
      EMAIL_FROM: "WCE Logistics <noreply@example.com>",
      PLATFORM_COMMISSION_BPS: "1000",
      STORAGE_REGION: "us-east-1",
      STORAGE_BUCKET: "unit-test",
      STORAGE_ACCESS_KEY_ID: "unit",
      STORAGE_SECRET_ACCESS_KEY: "unit",
      NODE_ENV: "test",
    },
  },
});
