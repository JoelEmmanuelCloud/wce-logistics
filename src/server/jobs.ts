import "server-only";
import { autoCompleteDeliveries } from "@/server/delivery";
import { expireOverdueRequests } from "@/server/marketplace";
import { notifyBooking, notifyDelivery, notifyOrder, notifyTruckDocumentsExpired } from "@/server/notifications";
import { expireOverdueOrders } from "@/server/orders";
import { flagTrucksWithExpiredDocuments } from "@/server/trucks";

export const JOB_NAMES = ["expire-documents", "expire-bookings", "complete-deliveries"] as const;
export type JobName = (typeof JOB_NAMES)[number];

export async function runJob(name: JobName): Promise<string> {
  switch (name) {
    case "expire-documents": {
      const flagged = await flagTrucksWithExpiredDocuments();
      for (const truck of flagged) {
        await notifyTruckDocumentsExpired(truck.vendorId, truck.id, truck.registrationNumber);
      }
      return `Flagged ${flagged.length} truck${flagged.length === 1 ? "" : "s"} with expired or missing documents.`;
    }
    case "expire-bookings": {
      const expired = await expireOverdueRequests();
      for (const booking of expired) {
        await notifyBooking("booking.expired", booking);
      }
      const orders = await expireOverdueOrders();
      for (const order of orders) {
        await notifyOrder("order.expired", order);
      }
      return `Expired ${expired.length} unanswered booking request${expired.length === 1 ? "" : "s"} and ${orders.length} order${orders.length === 1 ? "" : "s"}.`;
    }
    case "complete-deliveries": {
      const completed = await autoCompleteDeliveries();
      for (const booking of completed) {
        await notifyDelivery("completed", booking, { automatic: true });
      }
      return `Completed ${completed.length} delivered booking${completed.length === 1 ? "" : "s"}.`;
    }
  }
}
