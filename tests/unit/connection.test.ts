import { describe, expect, it } from "vitest";
import { connectionSettings, databaseUrl } from "@/server/db/connection";

describe("database connection settings", () => {
  it("turns off prepared statements and drops pooler-only parameters for the Supabase pooler", () => {
    const settings = connectionSettings("postgres://user:secret@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x&pgbouncer=true");
    expect(settings.prepare).toBe(false);
    expect(settings.url).toBe("postgres://user:secret@aws-0-eu-west-2.pooler.supabase.com:6543/postgres?sslmode=require");
  });

  it("keeps prepared statements for direct connections", () => {
    expect(connectionSettings("postgres://user:secret@db.example.supabase.co:5432/postgres?sslmode=require").prepare).toBe(true);
  });

  it("prefers the direct connection for migrations and the pooled one for the app", () => {
    const env = { POSTGRES_URL: "postgres://pooled", POSTGRES_URL_NON_POOLING: "postgres://direct" };
    expect(databaseUrl(env, "app")).toBe("postgres://pooled");
    expect(databaseUrl(env, "migrations")).toBe("postgres://direct");
    expect(databaseUrl({ ...env, DATABASE_URL: "postgres://explicit" }, "app")).toBe("postgres://explicit");
  });
});
