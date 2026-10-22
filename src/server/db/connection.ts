const POOLER_ONLY_PARAMS = ["pgbouncer", "supa"];

export function connectionSettings(rawUrl: string): { url: string; prepare: boolean } {
  const url = new URL(rawUrl);
  const pooled = url.port === "6543" || url.searchParams.get("pgbouncer") === "true";
  for (const param of POOLER_ONLY_PARAMS) {
    url.searchParams.delete(param);
  }
  return { url: url.toString(), prepare: !pooled };
}

export function databaseUrl(env: Record<string, string | undefined>, purpose: "app" | "migrations"): string | undefined {
  if (purpose === "migrations") {
    return env.MIGRATION_DATABASE_URL || env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL || env.POSTGRES_URL;
  }
  return env.DATABASE_URL || env.POSTGRES_URL;
}
