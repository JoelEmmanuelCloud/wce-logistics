import "server-only";
import { and, eq } from "drizzle-orm";
import { formatPhone } from "@/lib/phone";
import { formatNaira } from "@/lib/pricing";
import { site } from "@/lib/site";
import { db, schema } from "@/server/db";
import type { Booking, Dispute, Payout } from "@/server/db/schema";
import { sendEmail, type EmailMessage } from "@/server/email";
import { getPlatformSettings } from "@/server/settings";

type Template =
  | "booking.requested"
  | "booking.accepted"
  | "booking.declined"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.expired"
  | "payment.refunded"
  | "vendor.verified"
  | "vendor.info_required"
  | "vendor.rejected"
  | "truck.approved"
  | "truck.changes_requested"
  | "truck.documents_expired"
  | "payout.sent"
  | "payout_account.changed"
  | "driver.invited"
  | "delivery.driver_assigned"
  | "delivery.goods_collected"
  | "delivery.departed"
  | "delivery.delivery_attempted"
  | "delivery.delivered"
  | "delivery.incident_reported"
  | "delivery.completed"
  | "review.received"
  | "dispute.opened"
  | "dispute.updated"
  | "dispute.message";

type Content = Omit<EmailMessage, "to">;

async function deliver(userId: string, template: Template, content: Content): Promise<void> {
  const [user] = await db().select({ email: schema.users.email }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  if (!user) {
    return;
  }
  const body = [content.heading, ...content.paragraphs].join(" ");
  try {
    await sendEmail({ ...content, to: user.email });
    await db().insert(schema.notifications).values({ userId, channel: "email", recipient: user.email, template, body, status: "sent" });
  } catch (error) {
    console.error(`Notification ${template} to user ${userId} failed`, error);
    await db()
      .insert(schema.notifications)
      .values({
        userId,
        channel: "email",
        recipient: user.email,
        template,
        body,
        status: "failed",
        error: error instanceof Error ? error.message.slice(0, 500) : "unknown error",
      });
  }
}

async function vendorUserId(vendorId: string): Promise<string | null> {
  const [vendor] = await db().select({ userId: schema.vendorProfiles.userId }).from(schema.vendorProfiles).where(eq(schema.vendorProfiles.id, vendorId)).limit(1);
  return vendor?.userId ?? null;
}

function link(path: string): string {
  return new URL(path, site.url).toString();
}

export async function notifyBooking(event: Extract<Template, `booking.${string}` | "payment.refunded">, booking: Booking): Promise<void> {
  const amount = formatNaira(booking.totalKobo);
  const { responseWindowHours } = await getPlatformSettings();
  const vendorUser = await vendorUserId(booking.vendorId);
  const forCustomer = { label: "View booking", url: link(`/account/bookings/${booking.id}`) };
  const forVendor = { label: "View booking", url: link(`/vendor/bookings/${booking.id}`) };
  const jobs: Array<Promise<void>> = [];

  switch (event) {
    case "booking.requested":
      if (vendorUser) {
        jobs.push(
          deliver(vendorUser, event, {
            subject: `New booking request ${booking.reference}`,
            heading: "You have a new booking request",
            paragraphs: [`A shipper wants to book ${booking.reservedKg.toLocaleString("en-NG")} kg on your trip for ${amount}.`, `Accept or decline within ${responseWindowHours} hours, or the request expires and the space is released.`],
            action: { label: "Review request", url: forVendor.url },
          }),
        );
      }
      break;
    case "booking.accepted":
      jobs.push(
        deliver(booking.customerId, event, {
          subject: `Booking ${booking.reference} accepted`,
          heading: "Your booking was accepted",
          paragraphs: [`The vendor accepted booking ${booking.reference}. Pay ${amount} to confirm it and hold your space on the truck.`],
          action: { label: "Pay now", url: forCustomer.url },
        }),
      );
      break;
    case "booking.declined":
      jobs.push(
        deliver(booking.customerId, event, {
          subject: `Booking ${booking.reference} declined`,
          heading: "The vendor could not take this booking",
          paragraphs: [booking.statusNote ? `Their reason: ${booking.statusNote}` : "The vendor declined this request.", "Your shipment is open again, so you can choose another truck."],
          action: { label: "Choose another truck", url: link(`/account/shipments/${booking.shipmentId}`) },
        }),
      );
      break;
    case "booking.confirmed":
      jobs.push(
        deliver(booking.customerId, event, {
          subject: `Booking ${booking.reference} confirmed`,
          heading: "Payment received. You are booked.",
          paragraphs: [`We received ${amount} for booking ${booking.reference}. The vendor will contact you to arrange pickup.`],
          action: forCustomer,
        }),
      );
      if (vendorUser) {
        jobs.push(
          deliver(vendorUser, event, {
            subject: `Booking ${booking.reference} is paid`,
            heading: "A booking is paid and confirmed",
            paragraphs: [`Booking ${booking.reference} is paid. Contact the shipper to arrange pickup. Their details are on the booking page.`],
            action: forVendor,
          }),
        );
      }
      break;
    case "booking.cancelled":
      jobs.push(
        deliver(booking.customerId, event, {
          subject: `Booking ${booking.reference} cancelled`,
          heading: "This booking was cancelled",
          paragraphs: [booking.statusNote ? `Reason: ${booking.statusNote}` : "The booking was cancelled."],
          action: forCustomer,
        }),
      );
      if (vendorUser) {
        jobs.push(
          deliver(vendorUser, event, {
            subject: `Booking ${booking.reference} cancelled`,
            heading: "A booking on your trip was cancelled",
            paragraphs: [booking.statusNote ? `Reason: ${booking.statusNote}` : "The booking was cancelled.", "The reserved space is available to other shippers again."],
            action: forVendor,
          }),
        );
      }
      break;
    case "booking.expired":
      jobs.push(
        deliver(booking.customerId, event, {
          subject: `Booking ${booking.reference} expired`,
          heading: "The vendor did not answer in time",
          paragraphs: [`Your request expired after ${responseWindowHours} hours without an answer. Your shipment is open again.`],
          action: { label: "Choose another truck", url: link(`/account/shipments/${booking.shipmentId}`) },
        }),
      );
      if (vendorUser) {
        jobs.push(
          deliver(vendorUser, event, {
            subject: `Booking request ${booking.reference} expired`,
            heading: "A booking request expired",
            paragraphs: [`You did not answer this request within ${responseWindowHours} hours, so it expired and the space on your trip was released.`, "Answer requests quickly to win more bookings."],
            action: forVendor,
          }),
        );
      }
      break;
    case "payment.refunded":
      jobs.push(
        deliver(booking.customerId, event, {
          subject: `Refund for ${booking.reference}`,
          heading: "Your payment has been refunded",
          paragraphs: [`We refunded ${amount} for booking ${booking.reference}. Card refunds usually appear within 5 to 10 working days, depending on your bank.`],
          action: forCustomer,
        }),
      );
      break;
  }
  await Promise.all(jobs);
}

export async function notifyVendorReview(event: "vendor.verified" | "vendor.info_required" | "vendor.rejected", vendorId: string, note: string | null): Promise<void> {
  const userId = await vendorUserId(vendorId);
  if (!userId) {
    return;
  }
  const action = { label: "Open your dashboard", url: link("/vendor/verification") };
  const content: Record<typeof event, Content> = {
    "vendor.verified": {
      subject: "Your WCE Logistics vendor account is verified",
      heading: "You are verified",
      paragraphs: ["Our team has verified your business. Approved trucks can now be scheduled on trips and booked by shippers."],
      action,
    },
    "vendor.info_required": {
      subject: "We need more information to verify you",
      heading: "More information needed",
      paragraphs: [note ?? "Our team needs more information.", "Update your details and submit them again."],
      action,
    },
    "vendor.rejected": {
      subject: "Your vendor application was declined",
      heading: "We could not verify your application",
      paragraphs: [note ?? "Your application was declined.", "You can correct your details and submit again."],
      action,
    },
  };
  await deliver(userId, event, content[event]);
}

export async function notifyTruckDocumentsExpired(vendorId: string, truckId: string, registration: string): Promise<void> {
  const userId = await vendorUserId(vendorId);
  if (!userId) {
    return;
  }
  await deliver(userId, "truck.documents_expired", {
    subject: `${registration} is off the market`,
    heading: "A truck document has expired",
    paragraphs: [
      `A required document for ${registration} has expired or is missing, so the truck can no longer be booked.`,
      "Upload the renewed document and submit the truck for review to list it again. Existing bookings are not affected.",
    ],
    action: { label: "Update documents", url: link(`/vendor/trucks/${truckId}`) },
  });
}

export async function notifyTruckReview(event: "truck.approved" | "truck.changes_requested", vendorId: string, truckId: string, registration: string, note: string | null): Promise<void> {
  const userId = await vendorUserId(vendorId);
  if (!userId) {
    return;
  }
  const action = { label: "View truck", url: link(`/vendor/trucks/${truckId}`) };
  await deliver(
    userId,
    event,
    event === "truck.approved"
      ? { subject: `${registration} is approved`, heading: "Your truck is approved", paragraphs: [`${registration} passed review. Schedule it on trips so shippers can book it.`], action }
      : { subject: `Changes needed for ${registration}`, heading: "Your truck needs changes", paragraphs: [note ?? "Our team requested changes.", "Update the truck and submit it for review again."], action },
  );
}

export async function notifyDriverInvited(userId: string, vendorName: string): Promise<void> {
  await deliver(userId, "driver.invited", {
    subject: `${vendorName} added you as a driver on WCE Logistics`,
    heading: "You have been added as a driver",
    paragraphs: [
      `${vendorName} added you as a driver. You will see the deliveries they assign to you, with pickup and delivery details.`,
      "Sign in with this email address. We send you a one-time code each time, so there is no password to remember.",
    ],
    action: { label: "Sign in", url: link("/sign-in") },
  });
}

export type DeliveryNotice = "driver_assigned" | "goods_collected" | "departed" | "delivery_attempted" | "delivered" | "incident_reported" | "completed";

export async function notifyDelivery(
  event: DeliveryNotice,
  booking: Booking,
  details: { driverUserId?: string | null; driverName?: string | null; driverPhone?: string | null; note?: string | null; reportedByDriver?: boolean; automatic?: boolean } = {},
): Promise<void> {
  const template: Template = `delivery.${event}`;
  const vendorUser = await vendorUserId(booking.vendorId);
  const forCustomer = { label: "Follow your booking", url: link(`/account/bookings/${booking.id}`) };
  const forVendor = { label: "View booking", url: link(`/vendor/bookings/${booking.id}`) };
  const jobs: Array<Promise<void>> = [];
  const ref = booking.reference;
  const { autoCompleteHours } = await getPlatformSettings();

  switch (event) {
    case "driver_assigned":
      jobs.push(
        deliver(booking.customerId, template, {
          subject: `Driver assigned to ${ref}`,
          heading: "Your driver is assigned",
          paragraphs: [`${details.driverName ?? "A driver"} will carry booking ${ref}. You can reach them on ${formatPhone(details.driverPhone)} to coordinate pickup.`],
          action: forCustomer,
        }),
      );
      if (details.driverUserId) {
        jobs.push(
          deliver(details.driverUserId, template, {
            subject: `New delivery ${ref}`,
            heading: "You have a new delivery",
            paragraphs: [`You were assigned to booking ${ref}. Open it for the pickup address, cargo details and the shipper's phone number.`],
            action: { label: "Open delivery", url: link(`/driver/deliveries/${booking.id}`) },
          }),
        );
      }
      break;
    case "goods_collected":
      jobs.push(
        deliver(booking.customerId, template, {
          subject: `Goods collected for ${ref}`,
          heading: "Your goods have been collected",
          paragraphs: [`The driver collected the goods for booking ${ref}.`, ...(details.note ? [`Driver's note: ${details.note}`] : [])],
          action: forCustomer,
        }),
      );
      break;
    case "departed":
      jobs.push(
        deliver(booking.customerId, template, {
          subject: `${ref} is on the road`,
          heading: "Your shipment is on its way",
          paragraphs: [`Booking ${ref} has left for its destination. We will email you when it is delivered.`],
          action: forCustomer,
        }),
      );
      break;
    case "delivery_attempted":
      jobs.push(
        deliver(booking.customerId, template, {
          subject: `Delivery attempted for ${ref}`,
          heading: "The delivery could not be completed",
          paragraphs: [details.note ? `What happened: ${details.note}` : `The driver could not deliver booking ${ref}.`, "Contact the driver or vendor to arrange another attempt."],
          action: forCustomer,
        }),
      );
      if (vendorUser) {
        jobs.push(
          deliver(vendorUser, template, {
            subject: `Delivery attempted for ${ref}`,
            heading: "A delivery attempt failed",
            paragraphs: [details.note ? `Driver's note: ${details.note}` : `The delivery of ${ref} was not completed.`],
            action: forVendor,
          }),
        );
      }
      break;
    case "delivered":
      jobs.push(
        deliver(booking.customerId, template, {
          subject: `${ref} delivered`,
          heading: "Your shipment was delivered",
          paragraphs: [
            `Booking ${ref} was marked as delivered.`,
            `Please confirm you received everything in good condition. If something is wrong, report a problem from the booking page within ${autoCompleteHours} hours.`,
          ],
          action: { label: "Confirm receipt", url: forCustomer.url },
        }),
      );
      if (vendorUser) {
        jobs.push(
          deliver(vendorUser, template, {
            subject: `${ref} delivered`,
            heading: "Delivery recorded",
            paragraphs: [`Booking ${ref} is delivered. Your payout becomes payable once the shipper confirms receipt, or automatically after ${autoCompleteHours} hours without a dispute.`],
            action: forVendor,
          }),
        );
      }
      break;
    case "incident_reported":
      jobs.push(
        deliver(booking.customerId, template, {
          subject: `Update on ${ref}`,
          heading: "An incident was reported on your delivery",
          paragraphs: [details.note ?? "An incident was reported.", "The vendor will keep you updated. Contact them if you need more information."],
          action: forCustomer,
        }),
      );
      if (vendorUser && details.reportedByDriver) {
        jobs.push(
          deliver(vendorUser, template, {
            subject: `Incident reported on ${ref}`,
            heading: "Your driver reported an incident",
            paragraphs: [details.note ?? "An incident was reported."],
            action: forVendor,
          }),
        );
      }
      break;
    case "completed":
      if (details.automatic) {
        jobs.push(
          deliver(booking.customerId, template, {
            subject: `${ref} is complete`,
            heading: "Your booking is complete",
            paragraphs: [
              `Booking ${ref} was completed automatically ${autoCompleteHours} hours after delivery.`,
              "Tell other shippers how it went by rating the vendor.",
            ],
            action: { label: "Rate this delivery", url: forCustomer.url },
          }),
        );
      }
      if (vendorUser) {
        jobs.push(
          deliver(vendorUser, template, {
            subject: `${ref} completed`,
            heading: "Booking completed",
            paragraphs: [`Booking ${ref} is complete. Your share is ready to be paid out.`],
            action: { label: "View earnings", url: link("/vendor/payouts") },
          }),
        );
      }
      break;
  }
  await Promise.all(jobs);
}

export async function notifyReviewReceived(vendorId: string, bookingReference: string, rating: number): Promise<void> {
  const userId = await vendorUserId(vendorId);
  if (!userId) {
    return;
  }
  await deliver(userId, "review.received", {
    subject: `New ${rating}-star review for ${bookingReference}`,
    heading: "A shipper reviewed your service",
    paragraphs: [`You received a rating of ${rating} out of 5 for booking ${bookingReference}.`],
    action: { label: "View reviews", url: link("/vendor/reviews") },
  });
}

export async function notifyDispute(event: "dispute.opened" | "dispute.updated" | "dispute.message", dispute: Dispute, booking: Booking, exceptUserId: string | null): Promise<void> {
  const vendorUser = await vendorUserId(booking.vendorId);
  const recipients = [
    { userId: booking.customerId, url: link(`/account/bookings/${booking.id}/dispute`) },
    ...(vendorUser ? [{ userId: vendorUser, url: link(`/vendor/bookings/${booking.id}/dispute`) }] : []),
  ].filter((recipient) => recipient.userId !== exceptUserId);
  const closed = dispute.status === "resolved" || dispute.status === "closed";
  const content: Record<typeof event, Omit<Content, "action">> = {
    "dispute.opened": {
      subject: `Problem reported on ${booking.reference}`,
      heading: "A problem was reported",
      paragraphs: [`A dispute was opened on booking ${booking.reference}. Our team will review it and may ask both sides for information.`],
    },
    "dispute.updated": {
      subject: `Dispute update for ${booking.reference}`,
      heading: closed ? "Your dispute was closed" : "Your dispute was updated",
      paragraphs: [
        closed
          ? `Our team closed the dispute on ${booking.reference}. Outcome: ${dispute.resolution ?? "see the booking page."}`
          : `The dispute on ${booking.reference} is now ${dispute.status.replaceAll("_", " ")}.`,
      ],
    },
    "dispute.message": {
      subject: `New message on the dispute for ${booking.reference}`,
      heading: "There is a new message on your dispute",
      paragraphs: [`Open the dispute for booking ${booking.reference} to read and reply.`],
    },
  };
  const admins =
    event === "dispute.opened"
      ? await db()
          .select({ id: schema.users.id })
          .from(schema.users)
          .where(and(eq(schema.users.role, "admin"), eq(schema.users.status, "active")))
      : [];
  await Promise.all([
    ...recipients.map((recipient) => deliver(recipient.userId, event, { ...content[event], action: { label: "Open dispute", url: recipient.url } })),
    ...admins.map((admin) =>
      deliver(admin.id, event, {
        subject: `New dispute on ${booking.reference}`,
        heading: "A dispute needs attention",
        paragraphs: [`A ${dispute.openedByRole === "vendor" ? "vendor" : "shipper"} opened a dispute on booking ${booking.reference}. The vendor payout is on hold until it is closed.`],
        action: { label: "Open dispute", url: link(`/admin/disputes/${dispute.id}`) },
      }),
    ),
  ]);
}

export async function notifyPayoutSent(payout: Payout, bookingReference: string): Promise<void> {
  const userId = await vendorUserId(payout.vendorId);
  if (!userId) {
    return;
  }
  await deliver(userId, "payout.sent", {
    subject: `${formatNaira(payout.amountKobo)} paid for ${bookingReference}`,
    heading: "Your payout is on its way",
    paragraphs: [
      `We paid ${formatNaira(payout.amountKobo)} for booking ${bookingReference}${payout.destination ? ` to ${payout.destination}` : ""}.`,
      payout.transferReference ? `Transfer reference: ${payout.transferReference}.` : "Bank transfers usually arrive within minutes.",
    ],
    action: { label: "View earnings", url: link("/vendor/payouts") },
  });
}

export async function notifyPayoutAccountChanged(vendorId: string, description: string): Promise<void> {
  const userId = await vendorUserId(vendorId);
  if (!userId) {
    return;
  }
  await deliver(userId, "payout_account.changed", {
    subject: "Your payout bank account was updated",
    heading: "Payout bank account updated",
    paragraphs: [`Future payouts will go to ${description}.`, "If you did not make this change, sign in and update it immediately, then contact WCE Logistics support."],
    action: { label: "Review bank account", url: link("/vendor/payouts/account") },
  });
}
