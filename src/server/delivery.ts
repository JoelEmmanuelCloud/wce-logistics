import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, notInArray, sql } from "drizzle-orm";
import { addDays, lagosToday } from "@/lib/dates";
import {
  ASSIGNABLE_STATUSES,
  canRecord,
  DELIVERY_IN_PROGRESS,
  licenceCoversTruck,
  nextStatus,
  type DeliveryUpdateKind,
} from "@/lib/delivery";
import { recordAudit } from "@/server/audit";
import { db, schema, type Database } from "@/server/db";
import type { Booking, Driver, Route } from "@/server/db/schema";
import type { StoredFile } from "@/server/storage";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export class DeliveryError extends Error {}

const CLOSED_DISPUTE_STATUSES = ["resolved", "closed"] as const;

function tripDays(route: Pick<Route, "departureDate" | "transitHours">): [string, string] {
  return [route.departureDate, addDays(route.departureDate, Math.ceil(route.transitHours / 24))];
}

export function driverProblem(driver: Pick<Driver, "status" | "licenceClass" | "licenceExpiresOn">, truckCategory: string, departureDate: string): string | null {
  if (driver.status !== "active") {
    return "This driver is inactive.";
  }
  if (driver.licenceExpiresOn < lagosToday() || driver.licenceExpiresOn < departureDate) {
    return "This driver's licence expires before the trip departs.";
  }
  if (!licenceCoversTruck(driver.licenceClass, truckCategory)) {
    return `A class ${driver.licenceClass} licence does not cover this truck.`;
  }
  return null;
}

async function lockBooking(tx: Transaction, bookingId: string): Promise<Booking | null> {
  const [booking] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).limit(1).for("update");
  return booking ?? null;
}

async function scheduleClash(tx: Transaction, driverId: string, booking: Booking, route: Route): Promise<boolean> {
  const others = await tx
    .select({ departureDate: schema.routes.departureDate, transitHours: schema.routes.transitHours })
    .from(schema.bookings)
    .innerJoin(schema.routes, eq(schema.routes.id, schema.bookings.routeId))
    .where(
      and(
        eq(schema.bookings.driverId, driverId),
        ne(schema.bookings.routeId, booking.routeId),
        inArray(schema.bookings.status, [...DELIVERY_IN_PROGRESS]),
      ),
    );
  const [start, end] = tripDays(route);
  return others.some((other) => {
    const [otherStart, otherEnd] = tripDays(other);
    return start <= otherEnd && otherStart <= end;
  });
}

export async function assignDriver(vendorId: string, actorId: string, bookingId: string, driverId: string): Promise<{ booking: Booking; driver: Driver }> {
  return db().transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);
    if (!booking || booking.vendorId !== vendorId) {
      throw new DeliveryError("Booking not found.");
    }
    if (!ASSIGNABLE_STATUSES.includes(booking.status)) {
      throw new DeliveryError("A driver can only be assigned to a confirmed booking before pickup.");
    }
    const [driver] = await tx
      .select()
      .from(schema.drivers)
      .where(and(eq(schema.drivers.id, driverId), eq(schema.drivers.vendorId, vendorId)))
      .limit(1)
      .for("update");
    if (!driver) {
      throw new DeliveryError("Choose one of your drivers.");
    }
    if (booking.driverId === driver.id) {
      throw new DeliveryError(`${driver.fullName} is already assigned to this booking.`);
    }
    const [route] = await tx.select().from(schema.routes).where(eq(schema.routes.id, booking.routeId)).limit(1);
    const [truck] = await tx.select({ category: schema.trucks.category }).from(schema.trucks).where(eq(schema.trucks.id, booking.truckId)).limit(1);
    const problem = driverProblem(driver, truck.category, route.departureDate);
    if (problem) {
      throw new DeliveryError(problem);
    }
    if (await scheduleClash(tx, driver.id, booking, route)) {
      throw new DeliveryError(`${driver.fullName} is already driving another trip on these dates.`);
    }

    const reassigned = booking.driverId !== null;
    const [updated] = await tx
      .update(schema.bookings)
      .set({ driverId: driver.id, status: "pickup_scheduled" })
      .where(eq(schema.bookings.id, booking.id))
      .returning();
    const note = reassigned ? `Driver changed to ${driver.fullName}.` : `${driver.fullName} will carry this shipment.`;
    await tx.insert(schema.deliveryEvents).values({ bookingId: booking.id, kind: "driver_assigned", actorId, note });
    if (booking.status !== "pickup_scheduled") {
      await tx.insert(schema.bookingEvents).values({ bookingId: booking.id, status: "pickup_scheduled", actorId, note });
    }
    await recordAudit(
      { actorId, action: reassigned ? "booking.driver_reassigned" : "booking.driver_assigned", entityType: "booking", entityId: booking.id, metadata: { driverId: driver.id } },
      tx,
    );
    return { booking: updated, driver };
  });
}

export type DeliveryActor = { userId: string; role: "vendor"; vendorId: string } | { userId: string; role: "driver"; driverId: string };

export async function recordDeliveryUpdate(
  actor: DeliveryActor,
  bookingId: string,
  input: { kind: DeliveryUpdateKind; note: string | null; recipientName: string | null },
  photo: StoredFile | null,
): Promise<{ booking: Booking; statusChanged: boolean }> {
  return db().transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);
    const allowed =
      booking &&
      ((actor.role === "vendor" && booking.vendorId === actor.vendorId) || (actor.role === "driver" && booking.driverId === actor.driverId));
    if (!booking || !allowed) {
      throw new DeliveryError("Booking not found.");
    }
    if (!booking.driverId) {
      throw new DeliveryError("Assign a driver before recording delivery updates.");
    }
    const recorded = (await tx.select({ kind: schema.deliveryEvents.kind }).from(schema.deliveryEvents).where(eq(schema.deliveryEvents.bookingId, booking.id))).map(
      (row) => row.kind,
    );
    if (!canRecord(input.kind, booking.status, recorded)) {
      throw new DeliveryError("This update does not match the current stage of the delivery. Refresh the page and try again.");
    }

    const status = nextStatus(input.kind, booking.status);
    const statusChanged = status !== booking.status;
    const [updated] = statusChanged
      ? await tx
          .update(schema.bookings)
          .set({ status, ...(status === "delivered" ? { deliveredAt: sql`now()` } : {}) })
          .where(eq(schema.bookings.id, booking.id))
          .returning()
      : [booking];

    const note = input.kind === "delivered" && input.recipientName ? [`Received by ${input.recipientName}.`, input.note].filter(Boolean).join(" ") : input.note;
    await tx.insert(schema.deliveryEvents).values({
      bookingId: booking.id,
      kind: input.kind,
      actorId: actor.userId,
      note: input.note,
      recipientName: input.recipientName,
      photoStorageKey: photo?.storageKey ?? null,
      photoContentType: photo?.contentType ?? null,
      photoSizeBytes: photo?.sizeBytes ?? null,
    });
    if (statusChanged) {
      await tx.insert(schema.bookingEvents).values({ bookingId: booking.id, status, actorId: actor.userId, note });
    }
    await recordAudit(
      { actorId: actor.userId, action: `delivery.${input.kind}`, entityType: "booking", entityId: booking.id, metadata: { by: actor.role, photo: Boolean(photo) } },
      tx,
    );
    return { booking: updated, statusChanged };
  });
}

async function hasActiveDispute(tx: Transaction, bookingId: string): Promise<boolean> {
  const [dispute] = await tx
    .select({ id: schema.disputes.id })
    .from(schema.disputes)
    .where(and(eq(schema.disputes.bookingId, bookingId), notInArray(schema.disputes.status, [...CLOSED_DISPUTE_STATUSES])))
    .limit(1);
  return Boolean(dispute);
}

async function completeLocked(tx: Transaction, booking: Booking, actorId: string | null, note: string): Promise<Booking> {
  const [completed] = await tx
    .update(schema.bookings)
    .set({ status: "completed", completedAt: sql`now()` })
    .where(eq(schema.bookings.id, booking.id))
    .returning();
  await tx.insert(schema.bookingEvents).values({ bookingId: booking.id, status: "completed", actorId, note });
  if (!(await hasActiveDispute(tx, booking.id))) {
    await tx.update(schema.payouts).set({ status: "eligible" }).where(and(eq(schema.payouts.bookingId, booking.id), eq(schema.payouts.status, "on_hold")));
  }
  await recordAudit({ actorId, action: "booking.completed", entityType: "booking", entityId: booking.id, metadata: { automatic: actorId === null } }, tx);
  return completed;
}

export async function confirmReceipt(customerId: string, bookingId: string): Promise<Booking> {
  return db().transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);
    if (!booking || booking.customerId !== customerId) {
      throw new DeliveryError("Booking not found.");
    }
    if (booking.status !== "delivered") {
      throw new DeliveryError("You can confirm receipt once the booking is marked as delivered.");
    }
    await tx.insert(schema.deliveryEvents).values({ bookingId: booking.id, kind: "receipt_confirmed", actorId: customerId, note: "The shipper confirmed receipt." });
    return completeLocked(tx, booking, customerId, "The shipper confirmed receipt of the goods.");
  });
}

export async function listDeliveryEvents(bookingId: string) {
  return db()
    .select({ event: schema.deliveryEvents, actorName: schema.users.fullName, actorRole: schema.users.role })
    .from(schema.deliveryEvents)
    .leftJoin(schema.users, eq(schema.users.id, schema.deliveryEvents.actorId))
    .where(eq(schema.deliveryEvents.bookingId, bookingId))
    .orderBy(asc(schema.deliveryEvents.createdAt));
}

export async function findDriver(driverId: string): Promise<Driver | null> {
  const [driver] = await db().select().from(schema.drivers).where(eq(schema.drivers.id, driverId)).limit(1);
  return driver ?? null;
}

export async function driverOptions(vendorId: string, truckCategory: string, departureDate: string) {
  const drivers = await db()
    .select()
    .from(schema.drivers)
    .where(and(eq(schema.drivers.vendorId, vendorId), eq(schema.drivers.status, "active")))
    .orderBy(asc(schema.drivers.fullName));
  return drivers.map((driver) => ({ id: driver.id, fullName: driver.fullName, licenceClass: driver.licenceClass, problem: driverProblem(driver, truckCategory, departureDate) }));
}

export async function listDriverDeliveries(driverId: string, scope: "active" | "past") {
  const statuses = scope === "active" ? [...DELIVERY_IN_PROGRESS] : (["delivered", "completed", "cancelled", "disputed"] as const);
  return db()
    .select({
      booking: { id: schema.bookings.id, reference: schema.bookings.reference, status: schema.bookings.status },
      originCity: schema.shipments.originCity,
      originState: schema.shipments.originState,
      originAddress: schema.shipments.originAddress,
      destinationCity: schema.shipments.destinationCity,
      destinationState: schema.shipments.destinationState,
      weightKg: schema.shipments.weightKg,
      departureDate: schema.routes.departureDate,
      registrationNumber: schema.trucks.registrationNumber,
    })
    .from(schema.bookings)
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.bookings.shipmentId))
    .innerJoin(schema.routes, eq(schema.routes.id, schema.bookings.routeId))
    .innerJoin(schema.trucks, eq(schema.trucks.id, schema.bookings.truckId))
    .where(and(eq(schema.bookings.driverId, driverId), inArray(schema.bookings.status, [...statuses])))
    .orderBy(scope === "active" ? asc(schema.routes.departureDate) : desc(schema.bookings.updatedAt))
    .limit(scope === "active" ? 100 : 30);
}

export async function unassignedConfirmedCount(vendorId: string): Promise<number> {
  const [row] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.bookings)
    .where(and(eq(schema.bookings.vendorId, vendorId), eq(schema.bookings.status, "confirmed"), isNull(schema.bookings.driverId)));
  return row?.count ?? 0;
}
