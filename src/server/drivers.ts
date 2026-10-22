import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { DELIVERY_IN_PROGRESS } from "@/lib/delivery";
import { recordAudit } from "@/server/audit";
import { encrypt, hmac } from "@/server/crypto";
import { db, schema } from "@/server/db";
import type { Driver } from "@/server/db/schema";

export class DriverError extends Error {}

export type DriverInput = {
  fullName: string;
  email: string;
  phone: string;
  licenceNumber: string;
  licenceClass: string;
  licenceExpiresOn: string;
};

export type DriverUpdate = Pick<DriverInput, "phone" | "licenceClass" | "licenceExpiresOn">;

function licenceHash(licenceNumber: string): string {
  return hmac(`driver-licence:${licenceNumber}`);
}

function violatedConstraint(error: unknown): string | null {
  const cause = (error as { cause?: { code?: string; constraint_name?: string } })?.cause;
  return cause?.code === "23505" ? (cause.constraint_name ?? null) : null;
}

export async function listDrivers(vendorId: string) {
  return db()
    .select({ driver: schema.drivers, email: schema.users.email })
    .from(schema.drivers)
    .innerJoin(schema.users, eq(schema.users.id, schema.drivers.userId))
    .where(eq(schema.drivers.vendorId, vendorId))
    .orderBy(sql`case when ${schema.drivers.status} = 'active' then 0 else 1 end`, asc(schema.drivers.fullName));
}

export async function findVendorDriver(vendorId: string, driverId: string) {
  const [row] = await db()
    .select({ driver: schema.drivers, email: schema.users.email })
    .from(schema.drivers)
    .innerJoin(schema.users, eq(schema.users.id, schema.drivers.userId))
    .where(and(eq(schema.drivers.id, driverId), eq(schema.drivers.vendorId, vendorId)))
    .limit(1);
  return row ?? null;
}

export async function findDriverForUser(userId: string) {
  const [row] = await db()
    .select({
      driver: schema.drivers,
      vendorName: sql<string>`coalesce(${schema.vendorProfiles.businessName}, ${schema.vendorProfiles.legalName})`,
      vendorStatus: schema.vendorProfiles.verificationStatus,
    })
    .from(schema.drivers)
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.drivers.vendorId))
    .where(eq(schema.drivers.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function createDriver(vendorId: string, actorId: string, input: DriverInput): Promise<Driver> {
  try {
    return await db().transaction(async (tx) => {
      const [existing] = await tx.select().from(schema.users).where(eq(schema.users.email, input.email)).limit(1).for("update");
      if (existing && existing.role !== null) {
        throw new DriverError("This email already belongs to a WCE Logistics account. Use a different email for the driver.");
      }
      const [user] = existing
        ? await tx
            .update(schema.users)
            .set({ role: "driver", fullName: input.fullName, phone: input.phone })
            .where(eq(schema.users.id, existing.id))
            .returning()
        : await tx.insert(schema.users).values({ email: input.email, fullName: input.fullName, phone: input.phone, role: "driver" }).returning();

      const [driver] = await tx
        .insert(schema.drivers)
        .values({
          vendorId,
          userId: user.id,
          fullName: input.fullName,
          phone: input.phone,
          licenceNumberEncrypted: encrypt(input.licenceNumber),
          licenceNumberHash: licenceHash(input.licenceNumber),
          licenceNumberLast4: input.licenceNumber.slice(-4),
          licenceClass: input.licenceClass,
          licenceExpiresOn: input.licenceExpiresOn,
        })
        .returning();
      await recordAudit(
        { actorId, action: "driver.created", entityType: "driver", entityId: driver.id, metadata: { vendorId, licenceClass: input.licenceClass } },
        tx,
      );
      return driver;
    });
  } catch (error) {
    const constraint = violatedConstraint(error);
    if (constraint === "drivers_licence_hash_key") {
      throw new DriverError("A driver with this licence number is already registered. Contact support if this is a mistake.");
    }
    if (constraint === "users_email_key") {
      throw new DriverError("This email already belongs to a WCE Logistics account. Use a different email for the driver.");
    }
    throw error;
  }
}

export async function updateDriver(vendorId: string, actorId: string, driverId: string, input: DriverUpdate): Promise<void> {
  await db().transaction(async (tx) => {
    const [driver] = await tx
      .update(schema.drivers)
      .set({ phone: input.phone, licenceClass: input.licenceClass, licenceExpiresOn: input.licenceExpiresOn })
      .where(and(eq(schema.drivers.id, driverId), eq(schema.drivers.vendorId, vendorId)))
      .returning();
    if (!driver) {
      throw new DriverError("Driver not found.");
    }
    await tx.update(schema.users).set({ phone: input.phone }).where(eq(schema.users.id, driver.userId));
    await recordAudit({ actorId, action: "driver.updated", entityType: "driver", entityId: driver.id, metadata: { licenceClass: input.licenceClass, licenceExpiresOn: input.licenceExpiresOn } }, tx);
  });
}

export async function setDriverStatus(vendorId: string, actorId: string, driverId: string, status: "active" | "inactive"): Promise<void> {
  await db().transaction(async (tx) => {
    const [driver] = await tx
      .select()
      .from(schema.drivers)
      .where(and(eq(schema.drivers.id, driverId), eq(schema.drivers.vendorId, vendorId)))
      .limit(1)
      .for("update");
    if (!driver) {
      throw new DriverError("Driver not found.");
    }
    if (status === "inactive") {
      const [busy] = await tx
        .select({ id: schema.bookings.id })
        .from(schema.bookings)
        .where(and(eq(schema.bookings.driverId, driver.id), inArray(schema.bookings.status, [...DELIVERY_IN_PROGRESS])))
        .limit(1);
      if (busy) {
        throw new DriverError("This driver has deliveries in progress. Reassign them before deactivating the driver.");
      }
    }
    await tx.update(schema.drivers).set({ status }).where(eq(schema.drivers.id, driver.id));
    await recordAudit({ actorId, action: status === "active" ? "driver.reactivated" : "driver.deactivated", entityType: "driver", entityId: driver.id }, tx);
  });
}

export async function activeDriverFor(userId: string) {
  const row = await findDriverForUser(userId);
  if (!row || row.driver.status !== "active" || row.vendorStatus === "suspended") {
    return null;
  }
  return row;
}
