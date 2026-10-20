import "server-only";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/server/env";
import * as schema from "@/server/db/schema";

export type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { wceDb?: Database };

export function db(): Database {
  if (!globalForDb.wceDb) {
    const client = postgres(serverEnv().DATABASE_URL, { max: 10, idle_timeout: 20, connect_timeout: 10 });
    globalForDb.wceDb = drizzle(client, { schema });
  }
  return globalForDb.wceDb;
}

export { schema };
