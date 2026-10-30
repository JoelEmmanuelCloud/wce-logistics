import "server-only";
import { and, asc, desc, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { addDays, lagosToday } from "@/lib/dates";
import { quoteFor, type Quote } from "@/lib/pricing";
import type { RouteInput } from "@/lib/validation/marketplace";
import { recordAudit } from "@/server/audit";
import { db, schema, type Database } from "@/server/db";
import { getPlatformSettings } from "@/server/settings";
import type { Booking, BookingStatus, Route, Shipment } from "@/server/db/schema";

export const SEARCH_WINDOW_DAYS = 3;

export const OPEN_BOOKING_STATUSES: BookingStatus[] = [
  "pending_vendor_acceptance",
  "awaiting_payment",
  "confirmed",
  "pickup_scheduled",
  "goods_collected",
  "in_transit",
  "delivery_attempted",
];

export const CUSTOMER_CANCELLABLE: BookingStatus[] = ["pending_vendor_acceptance", "awaiting_payment", "confirmed", "pickup_scheduled"];
export const VENDOR_CANCELLABLE: BookingStatus[] = ["awaiting_payment", "confirmed", "pickup_scheduled"];

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

export class MarketplaceError extends Error {}

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function bookingReference(): string {
  let value = "";
  for (let index = 0; index < 8; index += 1) {
    value += REFERENCE_ALPHABET[randomInt(0, REFERENCE_ALPHABET.length)];
  }
  return `WCE-${value}`;
}

export async function listRoutesForVendor(vendorId: string) {
  return db()
    .select({ route: schema.routes, registrationNumber: schema.trucks.registrationNumber })
    .from(schema.routes)
    .innerJoin(schema.trucks, eq(schema.trucks.id, schema.routes.truckId))
    .where(eq(schema.routes.vendorId, vendorId))
    .orderBy(sql`case when ${schema.routes.status} in ('active', 'paused') then 0 else 1 end`, asc(schema.routes.departureDate));
}

export async function createRoute(vendorId: string, actorId: string, input: RouteInput): Promise<Route> {
  return db().transaction(async (tx) => {
    const [truck] = await tx
      .select()
      .from(schema.trucks)
      .where(and(eq(schema.trucks.id, input.truckId), eq(schema.trucks.vendorId, vendorId), isNull(schema.trucks.archivedAt)))
      .limit(1)
      .for("update");
    if (!truck) {
      throw new MarketplaceError("Choose one of your trucks.");
    }
    if (truck.listingStatus !== "active" && truck.listingStatus !== "unavailable") {
      throw new MarketplaceError("Only approved trucks can be scheduled. Finish the truck review first.");
    }
    if (input.capacityKg > truck.maxPayloadKg) {
      throw new MarketplaceError(`Capacity cannot exceed this truck's payload of ${truck.maxPayloadKg.toLocaleString("en-NG")} kg.`);
    }
    const [clash] = await tx
      .select({ id: schema.routes.id })
      .from(schema.routes)
      .where(
        and(
          eq(schema.routes.truckId, truck.id),
          eq(schema.routes.departureDate, input.departureDate),
          inArray(schema.routes.status, ["active", "paused"]),
        ),
      )
      .limit(1);
    if (clash) {
      throw new MarketplaceError("This truck already has a trip departing on that date.");
    }

    const [route] = await tx
      .insert(schema.routes)
      .values({
        truckId: truck.id,
        vendorId,
        originState: input.originState,
        originCity: input.originCity,
        destinationState: input.destinationState,
        destinationCity: input.destinationCity,
        departureDate: input.departureDate,
        transitHours: input.transitHours,
        capacityKg: input.capacityKg,
        allowsShared: input.allowsShared,
        ratePerTonneKobo: input.ratePerTonneKobo,
        minimumChargeKobo: input.minimumChargeKobo,
        dedicatedPriceKobo: input.dedicatedPriceKobo,
        loadingChargeKobo: input.loadingChargeKobo,
        offloadingChargeKobo: input.offloadingChargeKobo,
        tollChargeKobo: input.tollChargeKobo,
      })
      .returning();
    await recordAudit(
      {
        actorId,
        action: "route.created",
        entityType: "route",
        entityId: route.id,
        metadata: { truckId: truck.id, from: input.originState, to: input.destinationState, departureDate: input.departureDate },
      },
      tx,
    );
    return route;
  });
}

export async function setRouteStatus(vendorId: string, actorId: string, routeId: string, status: "active" | "paused" | "cancelled"): Promise<void> {
  await db().transaction(async (tx) => {
    const [route] = await tx
      .select()
      .from(schema.routes)
      .where(and(eq(schema.routes.id, routeId), eq(schema.routes.vendorId, vendorId)))
      .limit(1)
      .for("update");
    if (!route || route.status === "cancelled" || route.status === "completed") {
      throw new MarketplaceError("This trip can no longer be changed.");
    }
    if (status === "cancelled") {
      const [open] = await tx
        .select({ id: schema.bookings.id })
        .from(schema.bookings)
        .where(and(eq(schema.bookings.routeId, route.id), inArray(schema.bookings.status, OPEN_BOOKING_STATUSES)))
        .limit(1);
      if (open) {
        throw new MarketplaceError("This trip has open bookings. Resolve them before cancelling the trip.");
      }
    }
    await tx.update(schema.routes).set({ status }).where(eq(schema.routes.id, route.id));
    await recordAudit({ actorId, action: `route.${status === "active" ? "resumed" : status}`, entityType: "route", entityId: route.id }, tx);
  });
}

function eligibilityConditions(shipment: Shipment) {
  const today = lagosToday();
  const earliest = shipment.pickupDate > today ? shipment.pickupDate : today;
  const latest = addDays(shipment.pickupDate, SEARCH_WINDOW_DAYS);
  const conditions = [
    eq(schema.routes.status, "active"),
    eq(schema.routes.originState, shipment.originState),
    eq(schema.routes.destinationState, shipment.destinationState),
    gte(schema.routes.departureDate, earliest),
    lte(schema.routes.departureDate, latest),
    eq(schema.trucks.listingStatus, "active"),
    isNull(schema.trucks.archivedAt),
    eq(schema.vendorProfiles.verificationStatus, "verified"),
    sql`${shipment.cargoType} = any(${schema.trucks.cargoTypes})`,
  ];
  if (shipment.bookingType === "dedicated") {
    conditions.push(
      eq(schema.routes.reservedKg, 0),
      sql`${schema.routes.dedicatedPriceKobo} is not null`,
      gte(schema.routes.capacityKg, shipment.weightKg),
    );
  } else {
    conditions.push(eq(schema.routes.allowsShared, true), sql`${schema.routes.capacityKg} - ${schema.routes.reservedKg} >= ${shipment.weightKg}`);
  }
  return and(...conditions);
}

export async function searchOffers(shipment: Shipment) {
  const { minShipmentKg } = await getPlatformSettings();
  const rows = await db()
    .select({
      route: schema.routes,
      truck: {
        id: schema.trucks.id,
        registrationNumber: schema.trucks.registrationNumber,
        make: schema.trucks.make,
        model: schema.trucks.model,
        category: schema.trucks.category,
        bodyType: schema.trucks.bodyType,
        maxPayloadKg: schema.trucks.maxPayloadKg,
      },
      vendorName: sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`,
    })
    .from(schema.routes)
    .innerJoin(schema.trucks, eq(schema.trucks.id, schema.routes.truckId))
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.routes.vendorId))
    .where(eligibilityConditions(shipment))
    .orderBy(asc(schema.routes.departureDate))
    .limit(50);

  return rows
    .flatMap((row) => {
      const quote: Quote | null = quoteFor({
        type: shipment.bookingType,
        weightKg: shipment.weightKg,
        minWeightKg: Math.min(minShipmentKg, shipment.weightKg),
        ratePerTonneKobo: row.route.ratePerTonneKobo,
        minimumChargeKobo: row.route.minimumChargeKobo,
        dedicatedPriceKobo: row.route.dedicatedPriceKobo,
        loadingChargeKobo: row.route.loadingChargeKobo,
        offloadingChargeKobo: row.route.offloadingChargeKobo,
        tollChargeKobo: row.route.tollChargeKobo,
      });
      return quote ? [{ ...row, remainingKg: row.route.capacityKg - row.route.reservedKg, quote }] : [];
    })
    .sort((a, b) => a.quote.totalKobo - b.quote.totalKobo || a.route.departureDate.localeCompare(b.route.departureDate));
}

async function addEvent(tx: Transaction, bookingId: string, status: BookingStatus, actorId: string | null, note: string | null = null) {
  await tx.insert(schema.bookingEvents).values({ bookingId, status, actorId, note });
}

async function releaseCapacity(tx: Transaction, booking: Booking) {
  await tx
    .update(schema.routes)
    .set({ reservedKg: sql`greatest(${schema.routes.reservedKg} - ${booking.reservedKg}, 0)` })
    .where(eq(schema.routes.id, booking.routeId));
}

export async function requestBooking(customerId: string, shipmentId: string, routeId: string): Promise<Booking> {
  const settings = await getPlatformSettings();
  return db().transaction(async (tx) => {
    const [shipment] = await tx
      .select()
      .from(schema.shipments)
      .where(and(eq(schema.shipments.id, shipmentId), eq(schema.shipments.customerId, customerId)))
      .limit(1)
      .for("update");
    if (!shipment || shipment.status !== "open") {
      throw new MarketplaceError("This shipment already has an active booking.");
    }

    const [route] = await tx.select().from(schema.routes).where(eq(schema.routes.id, routeId)).limit(1).for("update");
    if (!route) {
      throw new MarketplaceError("This trip is no longer available.");
    }

    const [eligible] = await tx
      .select({ truckId: schema.trucks.id })
      .from(schema.routes)
      .innerJoin(schema.trucks, eq(schema.trucks.id, schema.routes.truckId))
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.routes.vendorId))
      .where(and(eq(schema.routes.id, route.id), eligibilityConditions(shipment)))
      .limit(1);
    if (!eligible) {
      throw new MarketplaceError("This trip no longer has room for your shipment. Choose another offer.");
    }

    const quote = quoteFor({
      type: shipment.bookingType,
      weightKg: shipment.weightKg,
      minWeightKg: Math.min(settings.minShipmentKg, shipment.weightKg),
      ratePerTonneKobo: route.ratePerTonneKobo,
      minimumChargeKobo: route.minimumChargeKobo,
      dedicatedPriceKobo: route.dedicatedPriceKobo,
      loadingChargeKobo: route.loadingChargeKobo,
      offloadingChargeKobo: route.offloadingChargeKobo,
      tollChargeKobo: route.tollChargeKobo,
    });
    if (!quote) {
      throw new MarketplaceError("We could not price this trip. Choose another offer.");
    }

    const reservedKg = shipment.bookingType === "dedicated" ? route.capacityKg - route.reservedKg : shipment.weightKg;
    await tx
      .update(schema.routes)
      .set({ reservedKg: sql`${schema.routes.reservedKg} + ${reservedKg}` })
      .where(eq(schema.routes.id, route.id));

    const [booking] = await tx
      .insert(schema.bookings)
      .values({
        reference: bookingReference(),
        shipmentId: shipment.id,
        routeId: route.id,
        truckId: route.truckId,
        vendorId: route.vendorId,
        customerId,
        type: shipment.bookingType,
        reservedKg,
        chargeableWeightKg: quote.chargeableWeightKg,
        ratePerTonneKobo: quote.ratePerTonneKobo,
        lineItems: quote.lineItems,
        totalKobo: quote.totalKobo,
        responseDueAt: sql`now() + make_interval(hours => ${settings.responseWindowHours})`,
      })
      .returning();

    await tx.update(schema.shipments).set({ status: "booked" }).where(eq(schema.shipments.id, shipment.id));
    await addEvent(tx, booking.id, "pending_vendor_acceptance", customerId);
    await recordAudit(
      { actorId: customerId, action: "booking.requested", entityType: "booking", entityId: booking.id, metadata: { reference: booking.reference, routeId: route.id } },
      tx,
    );
    return booking;
  });
}

async function lockBooking(tx: Transaction, bookingId: string): Promise<Booking | null> {
  const [booking] = await tx.select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).limit(1).for("update");
  return booking ?? null;
}

export async function respondToBooking(vendorId: string, actorId: string, bookingId: string, decision: "accept" | "reject", reason: string | null): Promise<Booking> {
  return db().transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);
    if (!booking || booking.vendorId !== vendorId) {
      throw new MarketplaceError("Booking not found.");
    }
    if (booking.status !== "pending_vendor_acceptance") {
      throw new MarketplaceError("This request has already been answered.");
    }
    if (booking.responseDueAt.getTime() <= Date.now()) {
      throw new MarketplaceError("The response window for this request has closed.");
    }

    const status: BookingStatus = decision === "accept" ? "awaiting_payment" : "rejected";
    const [updated] = await tx
      .update(schema.bookings)
      .set({ status, respondedAt: sql`now()`, statusNote: reason })
      .where(eq(schema.bookings.id, booking.id))
      .returning();
    if (decision === "reject") {
      await releaseCapacity(tx, booking);
      await tx.update(schema.shipments).set({ status: "open" }).where(eq(schema.shipments.id, booking.shipmentId));
    }
    await addEvent(tx, booking.id, status, actorId, reason);
    await recordAudit(
      { actorId, action: decision === "accept" ? "booking.accepted" : "booking.rejected", entityType: "booking", entityId: booking.id, metadata: { reason } },
      tx,
    );
    return updated;
  });
}

export async function cancelBooking(
  actor: { id: string; role: "customer" | "vendor" | "admin"; vendorId?: string },
  bookingId: string,
  reason: string,
): Promise<Booking> {
  return db().transaction(async (tx) => {
    const booking = await lockBooking(tx, bookingId);
    const owns =
      booking &&
      ((actor.role === "customer" && booking.customerId === actor.id) || (actor.role === "vendor" && booking.vendorId === actor.vendorId) || actor.role === "admin");
    if (!booking || !owns) {
      throw new MarketplaceError("Booking not found.");
    }
    const allowed = actor.role === "customer" ? CUSTOMER_CANCELLABLE : actor.role === "vendor" ? VENDOR_CANCELLABLE : OPEN_BOOKING_STATUSES;
    if (!allowed.includes(booking.status)) {
      throw new MarketplaceError("This booking can no longer be cancelled here. Contact support.");
    }

    const [updated] = await tx
      .update(schema.bookings)
      .set({ status: "cancelled", statusNote: reason })
      .where(eq(schema.bookings.id, booking.id))
      .returning();
    await releaseCapacity(tx, booking);
    await tx.update(schema.shipments).set({ status: "open" }).where(eq(schema.shipments.id, booking.shipmentId));
    await addEvent(tx, booking.id, "cancelled", actor.id, reason);
    await recordAudit({ actorId: actor.id, action: "booking.cancelled", entityType: "booking", entityId: booking.id, metadata: { reason, by: actor.role } }, tx);
    return updated;
  });
}

export async function getBookingDetail(bookingId: string) {
  const database = db();
  const [row] = await database
    .select({
      booking: schema.bookings,
      shipment: schema.shipments,
      route: schema.routes,
      truck: schema.trucks,
      vendorName: sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`,
      vendorEmail: schema.vendorProfiles.email,
      customerName: schema.users.fullName,
      customerPhone: schema.users.phone,
      vendorUserId: schema.vendorProfiles.userId,
      cargoLabel: schema.cargoCategories.label,
      driverName: schema.drivers.fullName,
      driverPhone: schema.drivers.phone,
      driverUserId: schema.drivers.userId,
    })
    .from(schema.bookings)
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.bookings.shipmentId))
    .innerJoin(schema.routes, eq(schema.routes.id, schema.bookings.routeId))
    .innerJoin(schema.trucks, eq(schema.trucks.id, schema.bookings.truckId))
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.bookings.vendorId))
    .innerJoin(schema.users, eq(schema.users.id, schema.bookings.customerId))
    .leftJoin(schema.drivers, eq(schema.drivers.id, schema.bookings.driverId))
    .leftJoin(schema.cargoCategories, eq(schema.cargoCategories.value, schema.shipments.cargoType))
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  if (!row) {
    return null;
  }
  const events = await database
    .select()
    .from(schema.bookingEvents)
    .where(eq(schema.bookingEvents.bookingId, bookingId))
    .orderBy(asc(schema.bookingEvents.createdAt));
  return { ...row, events };
}

export async function listBookings(filter: { customerId?: string; vendorId?: string; statuses?: BookingStatus[] }) {
  const conditions = [];
  if (filter.customerId) conditions.push(eq(schema.bookings.customerId, filter.customerId));
  if (filter.vendorId) conditions.push(eq(schema.bookings.vendorId, filter.vendorId));
  if (filter.statuses?.length) conditions.push(inArray(schema.bookings.status, filter.statuses));
  return db()
    .select({
      booking: schema.bookings,
      originCity: schema.shipments.originCity,
      originState: schema.shipments.originState,
      destinationCity: schema.shipments.destinationCity,
      destinationState: schema.shipments.destinationState,
      weightKg: schema.shipments.weightKg,
      departureDate: schema.routes.departureDate,
      registrationNumber: schema.trucks.registrationNumber,
      vendorName: sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`,
      customerName: schema.users.fullName,
    })
    .from(schema.bookings)
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.bookings.shipmentId))
    .innerJoin(schema.routes, eq(schema.routes.id, schema.bookings.routeId))
    .innerJoin(schema.trucks, eq(schema.trucks.id, schema.bookings.truckId))
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.bookings.vendorId))
    .innerJoin(schema.users, eq(schema.users.id, schema.bookings.customerId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.bookings.createdAt))
    .limit(200);
}

export async function listShipmentsForCustomer(customerId: string) {
  return db()
    .select()
    .from(schema.shipments)
    .where(and(eq(schema.shipments.customerId, customerId), ne(schema.shipments.status, "cancelled")))
    .orderBy(desc(schema.shipments.createdAt))
    .limit(100);
}

export async function findCustomerShipment(customerId: string, shipmentId: string): Promise<Shipment | null> {
  const [shipment] = await db()
    .select()
    .from(schema.shipments)
    .where(and(eq(schema.shipments.id, shipmentId), eq(schema.shipments.customerId, customerId)))
    .limit(1);
  return shipment ?? null;
}

export async function activeBookingForShipment(shipmentId: string): Promise<Booking | null> {
  const [booking] = await db()
    .select()
    .from(schema.bookings)
    .where(and(eq(schema.bookings.shipmentId, shipmentId), inArray(schema.bookings.status, [...OPEN_BOOKING_STATUSES, "delivered", "completed", "disputed"])))
    .limit(1);
  return booking ?? null;
}

export type Offer = Awaited<ReturnType<typeof searchOffers>>[number];

export async function findBooking(bookingId: string): Promise<Booking | null> {
  const [booking] = await db().select().from(schema.bookings).where(eq(schema.bookings.id, bookingId)).limit(1);
  return booking ?? null;
}

export async function expireOverdueRequests(): Promise<Booking[]> {
  return db().transaction(async (tx) => {
    const due = await tx
      .select()
      .from(schema.bookings)
      .where(and(eq(schema.bookings.status, "pending_vendor_acceptance"), lte(schema.bookings.responseDueAt, sql`now()`)))
      .limit(500)
      .for("update", { skipLocked: true });
    const expired: Booking[] = [];
    for (const booking of due) {
      const note = "The vendor did not respond in time.";
      const [updated] = await tx.update(schema.bookings).set({ status: "expired", statusNote: note }).where(eq(schema.bookings.id, booking.id)).returning();
      await releaseCapacity(tx, booking);
      await tx
        .update(schema.shipments)
        .set({ status: "open" })
        .where(and(eq(schema.shipments.id, booking.shipmentId), eq(schema.shipments.status, "booked")));
      await addEvent(tx, booking.id, "expired", null, note);
      await recordAudit({ actorId: null, action: "booking.expired", entityType: "booking", entityId: booking.id, metadata: { reservedKg: booking.reservedKg } }, tx);
      expired.push(updated);
    }
    return expired;
  });
}
