import { config } from "dotenv";
import { parsePhoneNumberFromString } from "libphonenumber-js/max";
import postgres from "postgres";
import { parseArgs } from "node:util";

config({ path: ".env.local" });

async function main() {
  const { values } = parseArgs({ options: { phone: { type: "string" }, name: { type: "string" } } });
  const phone = parsePhoneNumberFromString(values.phone ?? "", "NG");
  if (!phone || !phone.isValid()) {
    throw new Error("Pass a valid mobile number with --phone, for example --phone 08031234567");
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
      insert into users (phone, full_name, role)
      values (${phone.number}, ${name}, 'admin')
      on conflict (phone) do update set role = 'admin', full_name = coalesce(users.full_name, excluded.full_name), status = 'active', updated_at = now()
      returning id, (xmax = 0) as created`;
    await sql`
      insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
      values (null, 'user.admin_granted', 'user', ${user.id}, ${sql.json({ via: "cli" })})`;
    console.log(`${user.created ? "Created" : "Promoted"} administrator ${phone.formatInternational()}. They can now sign in at /sign-in.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
