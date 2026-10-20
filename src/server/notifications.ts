import "server-only";
import { eq } from "drizzle-orm";
import { formatNaira } from "@/lib/pricing";
import { site } from "@/lib/site";
import { db, schema } from "@/server/db";
import type { Booking } from "@/server/db/schema";
import { sendEmail, type EmailMessage } from "@/server/email";

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
  | "truck.changes_requested";

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
            paragraphs: [`A shipper wants to book ${booking.reservedKg.toLocaleString("en-NG")} kg on your trip for ${amount}.`, "Accept or decline within 24 hours, or the request expires and the space is released."],
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
          paragraphs: ["Your request expired after 24 hours without an answer. Your shipment is open again."],
          action: { label: "Choose another truck", url: link(`/account/shipments/${booking.shipmentId}`) },
        }),
      );
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
