import "./load-env";
import { closeDatabase } from "@/server/db";
import { expireOverdueRequests } from "@/server/marketplace";
import { notifyBooking } from "@/server/notifications";

async function main() {
  try {
    const expired = await expireOverdueRequests();
    for (const booking of expired) {
      await notifyBooking("booking.expired", booking);
    }
    console.log(`Expired ${expired.length} unanswered booking request${expired.length === 1 ? "" : "s"}.`);
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
