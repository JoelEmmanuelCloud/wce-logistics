import "./load-env";
import { closeDatabase } from "@/server/db";
import { notifyTruckDocumentsExpired } from "@/server/notifications";
import { flagTrucksWithExpiredDocuments } from "@/server/trucks";

async function main() {
  try {
    const flagged = await flagTrucksWithExpiredDocuments();
    for (const truck of flagged) {
      await notifyTruckDocumentsExpired(truck.vendorId, truck.id, truck.registrationNumber);
    }
    console.log(`Flagged ${flagged.length} truck${flagged.length === 1 ? "" : "s"} with expired or missing documents.`);
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
