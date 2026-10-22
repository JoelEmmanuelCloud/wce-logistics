import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/server/auth/dal";
import { db, schema } from "@/server/db";
import { signedDownloadUrl } from "@/server/storage";

const paramsSchema = z.object({
  kind: z.enum(["vendor-documents", "truck-documents", "truck-photos", "delivery-photos", "dispute-files"]),
  id: z.uuid(),
});

type FileRecord = { storageKey: string; fileName: string; allowedUserIds: Array<string | null> };

async function bookingParties(bookingId: string): Promise<Array<string | null>> {
  const [row] = await db()
    .select({ customerId: schema.bookings.customerId, vendorUserId: schema.vendorProfiles.userId, driverUserId: schema.drivers.userId })
    .from(schema.bookings)
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.bookings.vendorId))
    .leftJoin(schema.drivers, eq(schema.drivers.id, schema.bookings.driverId))
    .where(eq(schema.bookings.id, bookingId))
    .limit(1);
  return row ? [row.customerId, row.vendorUserId, row.driverUserId] : [];
}

async function findFile(kind: z.infer<typeof paramsSchema>["kind"], id: string): Promise<FileRecord | null> {
  const database = db();
  if (kind === "vendor-documents") {
    const [row] = await database
      .select({ storageKey: schema.vendorDocuments.storageKey, fileName: schema.vendorDocuments.fileName, ownerUserId: schema.vendorProfiles.userId })
      .from(schema.vendorDocuments)
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.vendorDocuments.vendorId))
      .where(eq(schema.vendorDocuments.id, id))
      .limit(1);
    return row ? { storageKey: row.storageKey, fileName: row.fileName, allowedUserIds: [row.ownerUserId] } : null;
  }
  if (kind === "truck-documents") {
    const [row] = await database
      .select({ storageKey: schema.truckDocuments.storageKey, fileName: schema.truckDocuments.fileName, ownerUserId: schema.vendorProfiles.userId })
      .from(schema.truckDocuments)
      .innerJoin(schema.trucks, eq(schema.trucks.id, schema.truckDocuments.truckId))
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.trucks.vendorId))
      .where(eq(schema.truckDocuments.id, id))
      .limit(1);
    return row ? { storageKey: row.storageKey, fileName: row.fileName, allowedUserIds: [row.ownerUserId] } : null;
  }
  if (kind === "truck-photos") {
    const [row] = await database
      .select({ storageKey: schema.truckPhotos.storageKey, ownerUserId: schema.vendorProfiles.userId })
      .from(schema.truckPhotos)
      .innerJoin(schema.trucks, eq(schema.trucks.id, schema.truckPhotos.truckId))
      .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.trucks.vendorId))
      .where(eq(schema.truckPhotos.id, id))
      .limit(1);
    return row ? { storageKey: row.storageKey, fileName: "truck-photo", allowedUserIds: [row.ownerUserId] } : null;
  }
  if (kind === "delivery-photos") {
    const [row] = await database
      .select({ storageKey: schema.deliveryEvents.photoStorageKey, bookingId: schema.deliveryEvents.bookingId })
      .from(schema.deliveryEvents)
      .where(eq(schema.deliveryEvents.id, id))
      .limit(1);
    return row?.storageKey ? { storageKey: row.storageKey, fileName: "delivery-photo", allowedUserIds: await bookingParties(row.bookingId) } : null;
  }
  const [row] = await database
    .select({ storageKey: schema.disputeMessages.attachmentStorageKey, fileName: schema.disputeMessages.attachmentFileName, bookingId: schema.disputes.bookingId })
    .from(schema.disputeMessages)
    .innerJoin(schema.disputes, eq(schema.disputes.id, schema.disputeMessages.disputeId))
    .where(eq(schema.disputeMessages.id, id))
    .limit(1);
  if (!row?.storageKey) {
    return null;
  }
  const [customerId, vendorUserId] = await bookingParties(row.bookingId);
  return { storageKey: row.storageKey, fileName: row.fileName ?? "attachment", allowedUserIds: [customerId, vendorUserId] };
}

export async function GET(_request: Request, context: RouteContext<"/files/[kind]/[id]">) {
  const parsed = paramsSchema.safeParse(await context.params);
  if (!parsed.success) {
    return new NextResponse("Not found", { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Sign in required", { status: 401 });
  }

  const file = await findFile(parsed.data.kind, parsed.data.id);
  if (!file || (user.role !== "admin" && !file.allowedUserIds.includes(user.id))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = await signedDownloadUrl(file.storageKey, file.fileName);
  return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "private, no-store" } });
}
