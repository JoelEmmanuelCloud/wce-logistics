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
export const fakeResendPort = Number(process.env.FAKE_RESEND_PORT ?? 4010);
export const fakePaystackPort = Number(process.env.FAKE_PAYSTACK_PORT ?? 4020);
export const paystackTestSecret = "sk_test_e2e0000000000000000000000000000000000";

export const adminDatabaseUrl = devUrl.toString();

export const testEnv = {
  DATABASE_URL: testUrl.toString(),
  SITE_URL: `http://localhost:${e2ePort}`,
  CONTACT_EMAIL: "support@example.com",
  CONTACT_WHATSAPP: "+2348031234567",
  EMAIL_PROVIDER: "resend",
  EMAIL_FROM: "WCE Logistics <noreply@example.com>",
  RESEND_API_KEY: "re_e2e_test_key",
  RESEND_BASE_URL: `http://127.0.0.1:${fakeResendPort}`,
  STORAGE_BUCKET: `${required("STORAGE_BUCKET")}-test`,
  PAYSTACK_SECRET_KEY: paystackTestSecret,
  PAYSTACK_BASE_URL: `http://127.0.0.1:${fakePaystackPort}`,
  PLATFORM_COMMISSION_BPS: "1000",
} as const;
