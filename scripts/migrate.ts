import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { connectionSettings, databaseUrl } from "../src/server/db/connection";

config({ path: ".env.local" });

async function main() {
  const raw = databaseUrl(process.env, "migrations");
  if (!raw) {
    throw new Error("DATABASE_URL or POSTGRES_URL_NON_POOLING is required");
  }
  const { url, prepare } = connectionSettings(raw);
  const client = postgres(url, { max: 1, prepare });
  try {
    await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
    console.log("Database migrations applied");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
