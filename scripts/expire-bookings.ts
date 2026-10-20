import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required");
  }
  const sql = postgres(url, { max: 1 });
  try {
    const expired = await sql.begin(async (tx) => {
      const rows = await tx<{ id: string; route_id: string; shipment_id: string; reserved_kg: number }[]>`
        update bookings
        set status = 'expired', status_note = 'The vendor did not respond in time.', updated_at = now()
        where id in (
          select id from bookings
          where status = 'pending_vendor_acceptance' and response_due_at <= now()
          for update skip locked
        )
        returning id, route_id, shipment_id, reserved_kg`;
      for (const row of rows) {
        await tx`update routes set reserved_kg = greatest(reserved_kg - ${row.reserved_kg}, 0), updated_at = now() where id = ${row.route_id}`;
        await tx`update shipments set status = 'open', updated_at = now() where id = ${row.shipment_id} and status = 'booked'`;
        await tx`insert into booking_events (booking_id, status, note) values (${row.id}, 'expired', 'The vendor did not respond in time.')`;
        await tx`
          insert into audit_logs (actor_id, action, entity_type, entity_id, metadata)
          values (null, 'booking.expired', 'booking', ${row.id}, ${tx.json({ reservedKg: row.reserved_kg })})`;
      }
      return rows;
    });
    console.log(`Expired ${expired.length} unanswered booking request${expired.length === 1 ? "" : "s"}.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
