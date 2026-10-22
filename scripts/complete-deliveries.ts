import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const AUTO_COMPLETE_HOURS = 72;
const NOTE = `Completed automatically ${AUTO_COMPLETE_HOURS} hours after delivery.`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  const sql = postgres(url, { max: 1 });
  try {
    const completed = await sql.begin(async (tx) => {
      const rows = await tx<{ id: string }[]>`
        update bookings
        set status = 'completed', completed_at = now(), updated_at = now()
        where id in (
          select b.id from bookings b
          where b.status = 'delivered'
            and b.delivered_at <= now() - make_interval(hours => ${AUTO_COMPLETE_HOURS})
            and not exists (
              select 1 from disputes d where d.booking_id = b.id and d.status not in ('resolved', 'closed')
            )
          for update skip locked
        )
        returning id`;
      for (const row of rows) {
        await tx`insert into booking_events (booking_id, status, note) values (${row.id}, 'completed', ${NOTE})`;
        await tx`update payouts set status = 'eligible', updated_at = now() where booking_id = ${row.id} and status = 'on_hold'`;
        await tx`
          insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
          values (null, 'booking.completed', 'booking', ${row.id}, ${tx.json({ automatic: true })})`;
      }
      return rows;
    });
    console.log(`Completed ${completed.length} delivered booking${completed.length === 1 ? "" : "s"}.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
