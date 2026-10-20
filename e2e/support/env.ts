import { config } from "dotenv";

config({ path: ".env.local" });

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set in .env.local to run end-to-end tests`);
  }
  return value;
}

const devUrl = new URL(required("DATABASE_URL"));
const testUrl = new URL(devUrl);
testUrl.pathname = "/wce_logistics_test";

export const e2ePort = Number(process.env.E2E_PORT ?? 3300);
export const fakeTermiiPort = Number(process.env.FAKE_TERMII_PORT ?? 4010);

export const adminDatabaseUrl = devUrl.toString();

export const testEnv = {
  DATABASE_URL: testUrl.toString(),
  SITE_URL: `http://localhost:${e2ePort}`,
  CONTACT_EMAIL: "support@example.com",
  SMS_PROVIDER: "termii",
  TERMII_API_KEY: "e2e-test-key",
  TERMII_SENDER_ID: "WCE",
  TERMII_BASE_URL: `http://127.0.0.1:${fakeTermiiPort}`,
  STORAGE_BUCKET: `${required("STORAGE_BUCKET")}-test`,
} as const;
