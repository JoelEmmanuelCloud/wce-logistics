import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const REQUIRED = ["vehicle_registration", "proof_of_ownership", "roadworthiness", "insurance"];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  const sql = postgres(url, { max: 1 });
  try {
    const expired = await sql.begin(async (tx) => {
      const rows = await tx<{ id: string; previous: string }[]>`
        update trucks t
        set listing_status = 'expired_documentation', updated_at = now()
        from (select id, listing_status from trucks where listing_status in ('active', 'unavailable') and archived_at is null for update) previous
        where t.id = previous.id
          and exists (
            select 1
            from unnest(${REQUIRED}::truck_document_type[]) as required(type)
            left join lateral (
              select d.status, d.expiry_date
              from truck_documents d
              where d.truck_id = t.id and d.type = required.type
              order by d.uploaded_at desc
              limit 1
            ) latest on true
            where latest.status is null
               or latest.status = 'rejected'
               or (latest.expiry_date is not null and latest.expiry_date <= current_date)
          )
        returning t.id, previous.listing_status as previous`;
      for (const row of rows) {
        await tx`
          insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
          values (null, 'truck.documents_expired', 'truck', ${row.id}, ${tx.json({ previousStatus: row.previous })})`;
      }
      return rows;
    });
    console.log(`Flagged ${expired.length} truck${expired.length === 1 ? "" : "s"} with expired or missing documents.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
