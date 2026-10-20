import { test as base, expect, type Page } from "@playwright/test";
import { createHash, randomBytes, randomInt } from "node:crypto";
import postgres from "postgres";
import { e2ePort, fakeTermiiPort, testEnv } from "./env";

type Role = "customer" | "vendor" | "admin";

export type TestUser = { id: string; phone: string; fullName: string };

type Fixtures = {
  sql: postgres.Sql;
  signInAs: (role: Role | null, overrides?: { fullName?: string }) => Promise<TestUser>;
  createUser: (role: Role | null, fullName?: string) => Promise<TestUser>;
};

export function uniquePhone(): string {
  return `+234803${randomInt(1_000_000, 9_999_999)}`;
}

export async function readOtp(phone: string): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await fetch(`http://127.0.0.1:${fakeTermiiPort}/messages?to=${phone.replace(/^\+/, "")}`);
    const messages = (await response.json()) as Array<{ sms: string }>;
    const code = messages.at(-1)?.sms.match(/code is (\d{6})/)?.[1];
    if (code) {
      return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No code was sent to ${phone}`);
}

export async function createSessionFor(sql: postgres.Sql, page: Page, userId: string) {
  const token = randomBytes(32).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  await sql`insert into sessions (user_id, token_hash, expires_at) values (${userId}, ${hash}, now() + interval '1 day')`;
  await page.context().addCookies([
    { name: "__Host-wce_session", value: token, url: `https://localhost:${e2ePort}`, httpOnly: true, secure: true, sameSite: "Lax" },
  ]);
}

export const test = base.extend<Fixtures>({
  sql: async ({}, provide) => {
    const sql = postgres(testEnv.DATABASE_URL, { max: 2, onnotice: () => {} });
    await provide(sql);
    await sql.end();
  },
  createUser: async ({ sql }, provide) => {
    await provide(async (role, fullName = "Test User") => {
      const phone = uniquePhone();
      const [user] = await sql<{ id: string }[]>`
        insert into users (phone, full_name, role) values (${phone}, ${role === null ? null : fullName}, ${role})
        returning id`;
      return { id: user.id, phone, fullName };
    });
  },
  signInAs: async ({ sql, page, createUser }, provide) => {
    await provide(async (role, overrides) => {
      const user = await createUser(role, overrides?.fullName);
      await createSessionFor(sql, page, user.id);
      return user;
    });
  },
});

export { expect };
