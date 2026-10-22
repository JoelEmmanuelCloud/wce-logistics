import "./load-env";
import { closeDatabase } from "@/server/db";
import { autoCompleteDeliveries } from "@/server/delivery";
import { notifyDelivery } from "@/server/notifications";

async function main() {
  try {
    const completed = await autoCompleteDeliveries();
    for (const booking of completed) {
      await notifyDelivery("completed", booking, { automatic: true });
    }
    console.log(`Completed ${completed.length} delivered booking${completed.length === 1 ? "" : "s"}.`);
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
