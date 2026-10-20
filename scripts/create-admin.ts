import { config } from "dotenv";
import postgres from "postgres";
import { parseArgs } from "node:util";

config({ path: ".env.local" });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function main() {
  const { values } = parseArgs({ options: { email: { type: "string" }, name: { type: "string" } } });
  const email = values.email?.trim().toLowerCase();
  if (!email || !EMAIL_PATTERN.test(email)) {
    throw new Error("Pass a valid email address with --email, for example --email ada@wcelogistics.com");
  }
  const name = values.name?.trim();
  if (!name || name.length < 2) {
    throw new Error('Pass the administrator name with --name, for example --name "Ada Obi"');
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }

  const sql = postgres(url, { max: 1 });
  try {
    const [user] = await sql<{ id: string; created: boolean }[]>`
      insert into users (email, full_name, role)
      values (${email}, ${name}, 'admin')
      on conflict (lower(email)) do update set role = 'admin', full_name = coalesce(users.full_name, excluded.full_name), status = 'active', updated_at = now()
      returning id, (xmax = 0) as created`;
    await sql`
      insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
      values (null, 'user.admin_granted', 'user', ${user.id}, ${sql.json({ via: "cli" })})`;
    console.log(`${user.created ? "Created" : "Promoted"} administrator ${email}. They can now sign in at /sign-in.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
