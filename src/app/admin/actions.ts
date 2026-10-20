"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { errorState, successState, type FormState } from "@/lib/form-state";
import { recordAudit } from "@/server/audit";
import { requireRole } from "@/server/auth/dal";
import { destroyAllSessionsFor } from "@/server/auth/session";
import { decrypt } from "@/server/crypto";
import { db, schema } from "@/server/db";
import { MIN_TRUCK_PHOTOS, requiredDocumentsApproved, todayIso, truckSubmissionChecks } from "@/server/trucks";
import { latestDocumentsByType, requiredVendorDocuments } from "@/server/vendors";
import { notifyTruckReview, notifyVendorReview } from "@/server/notifications";

const id = z.uuid();
const note = z.string().trim().max(1000);
const requiredNote = note.min(10, "Explain the reason in at least 10 characters so the vendor knows what to do.");

function readNote(formData: FormData, required: boolean): { ok: true; value: string | null } | { ok: false; state: FormState } {
  const parsed = (required ? requiredNote : note).safeParse(formData.get("note") ?? "");
  if (!parsed.success) {
    return { ok: false, state: errorState(parsed.error.issues[0].message, { note: [parsed.error.issues[0].message] }) };
  }
  return { ok: true, value: parsed.data || null };
}

export async function decideVendorAction(vendorId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const vendorKey = id.safeParse(vendorId);
  const decision = z.enum(["start_review", "approve", "request_info", "reject"]).safeParse(formData.get("decision"));
  if (!vendorKey.success || !decision.success) {
    return errorState("Choose a decision.");
  }
  const noteResult = readNote(formData, decision.data === "request_info" || decision.data === "reject");
  if (!noteResult.ok) {
    return noteResult.state;
  }

  const database = db();
  const [vendor] = await database.select().from(schema.vendorProfiles).where(eq(schema.vendorProfiles.id, vendorKey.data)).limit(1);
  if (!vendor) {
    return errorState("Vendor not found.");
  }

  const reviewable = ["submitted", "under_review"] as const;
  if (!(reviewable as readonly string[]).includes(vendor.verificationStatus)) {
    return errorState("This vendor is not awaiting review.");
  }

  if (decision.data === "start_review") {
    await database
      .update(schema.vendorProfiles)
      .set({ verificationStatus: "under_review" })
      .where(and(eq(schema.vendorProfiles.id, vendor.id), eq(schema.vendorProfiles.verificationStatus, "submitted")));
    await recordAudit({ actorId: admin.id, action: "vendor.review_started", entityType: "vendor", entityId: vendor.id });
    refresh();
    return successState("Review started.");
  }

  if (decision.data === "approve") {
    const documents = await database.select().from(schema.vendorDocuments).where(eq(schema.vendorDocuments.vendorId, vendor.id));
    const latest = latestDocumentsByType(documents);
    const missing = requiredVendorDocuments(vendor.category).filter((type) => {
      const document = latest.get(type);
      return !document || document.status === "rejected";
    });
    if (missing.length > 0 || !vendor.idDocumentReferenceEncrypted) {
      return errorState("This vendor is missing required identity details or documents. Request more information instead.");
    }
    const pendingIds = [...latest.values()].filter((document) => document.status === "pending").map((document) => document.id);

    await database.transaction(async (tx) => {
      if (pendingIds.length > 0) {
        await tx
          .update(schema.vendorDocuments)
          .set({ status: "approved", reviewedBy: admin.id, reviewedAt: sql`now()` })
          .where(inArray(schema.vendorDocuments.id, pendingIds));
      }
      await tx
        .update(schema.vendorProfiles)
        .set({ verificationStatus: "verified", reviewNote: noteResult.value, reviewedAt: sql`now()`, reviewedBy: admin.id })
        .where(eq(schema.vendorProfiles.id, vendor.id));
      await recordAudit(
        { actorId: admin.id, action: "vendor.verified", entityType: "vendor", entityId: vendor.id, metadata: { approvedDocuments: pendingIds.length } },
        tx,
      );
    });
    after(() => notifyVendorReview("vendor.verified", vendor.id, null));
    refresh();
    return successState("Vendor verified.");
  }

  const status = decision.data === "request_info" ? "info_required" : "rejected";
  await database
    .update(schema.vendorProfiles)
    .set({ verificationStatus: status, reviewNote: noteResult.value, reviewedAt: sql`now()`, reviewedBy: admin.id })
    .where(eq(schema.vendorProfiles.id, vendor.id));
  await recordAudit({
    actorId: admin.id,
    action: decision.data === "request_info" ? "vendor.info_requested" : "vendor.rejected",
    entityType: "vendor",
    entityId: vendor.id,
    metadata: { note: noteResult.value },
  });
  after(() => notifyVendorReview(decision.data === "request_info" ? "vendor.info_required" : "vendor.rejected", vendor.id, noteResult.value));
  refresh();
  return successState(decision.data === "request_info" ? "Information requested from the vendor." : "Vendor application declined.");
}

export async function setVendorSuspensionAction(vendorId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const vendorKey = id.safeParse(vendorId);
  const suspend = formData.get("decision") === "suspend";
  if (!vendorKey.success) {
    return errorState("Vendor not found.");
  }
  const noteResult = readNote(formData, suspend);
  if (!noteResult.ok) {
    return noteResult.state;
  }

  const [updated] = await db()
    .update(schema.vendorProfiles)
    .set(
      suspend
        ? { verificationStatus: "suspended", reviewNote: noteResult.value, reviewedAt: sql`now()`, reviewedBy: admin.id }
        : { verificationStatus: "verified", reviewNote: null, reviewedAt: sql`now()`, reviewedBy: admin.id },
    )
    .where(
      and(
        eq(schema.vendorProfiles.id, vendorKey.data),
        suspend ? eq(schema.vendorProfiles.verificationStatus, "verified") : eq(schema.vendorProfiles.verificationStatus, "suspended"),
      ),
    )
    .returning({ id: schema.vendorProfiles.id });
  if (!updated) {
    return errorState(suspend ? "Only verified vendors can be suspended." : "This vendor is not suspended.");
  }

  await recordAudit({
    actorId: admin.id,
    action: suspend ? "vendor.suspended" : "vendor.reinstated",
    entityType: "vendor",
    entityId: updated.id,
    metadata: { note: noteResult.value },
  });
  refresh();
  return successState(suspend ? "Vendor suspended. Their trucks cannot take bookings." : "Vendor reinstated.");
}

export async function reviewVendorDocumentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const documentId = id.safeParse(formData.get("documentId"));
  const decision = z.enum(["approve", "reject"]).safeParse(formData.get("decision"));
  if (!documentId.success || !decision.success) {
    return errorState("Choose a decision.");
  }
  const reason = readNote(formData, decision.data === "reject");
  if (!reason.ok) {
    return reason.state;
  }

  const [document] = await db()
    .update(schema.vendorDocuments)
    .set({
      status: decision.data === "approve" ? "approved" : "rejected",
      rejectionReason: decision.data === "reject" ? reason.value : null,
      reviewedBy: admin.id,
      reviewedAt: sql`now()`,
    })
    .where(eq(schema.vendorDocuments.id, documentId.data))
    .returning({ id: schema.vendorDocuments.id, vendorId: schema.vendorDocuments.vendorId });
  if (!document) {
    return errorState("Document not found.");
  }

  await recordAudit({
    actorId: admin.id,
    action: decision.data === "approve" ? "vendor_document.approved" : "vendor_document.rejected",
    entityType: "vendor_document",
    entityId: document.id,
    metadata: { vendorId: document.vendorId, reason: reason.value },
  });
  refresh();
  return successState(decision.data === "approve" ? "Document approved." : "Document rejected.");
}

export async function revealVendorIdReferenceAction(vendorId: string): Promise<{ value: string } | { error: string }> {
  const admin = await requireRole("admin");
  const vendorKey = id.safeParse(vendorId);
  if (!vendorKey.success) {
    return { error: "Vendor not found." };
  }
  const [vendor] = await db()
    .select({ encrypted: schema.vendorProfiles.idDocumentReferenceEncrypted })
    .from(schema.vendorProfiles)
    .where(eq(schema.vendorProfiles.id, vendorKey.data))
    .limit(1);
  if (!vendor?.encrypted) {
    return { error: "No ID number on file." };
  }
  await recordAudit({ actorId: admin.id, action: "vendor.id_reference_viewed", entityType: "vendor", entityId: vendorKey.data });
  return { value: decrypt(vendor.encrypted) };
}

export async function decideTruckAction(truckId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const truckKey = id.safeParse(truckId);
  const decision = z.enum(["approve", "request_changes", "suspend", "reinstate"]).safeParse(formData.get("decision"));
  if (!truckKey.success || !decision.success) {
    return errorState("Choose a decision.");
  }
  const noteResult = readNote(formData, decision.data === "request_changes" || decision.data === "suspend");
  if (!noteResult.ok) {
    return noteResult.state;
  }

  const database = db();
  const [row] = await database
    .select({ truck: schema.trucks, vendorStatus: schema.vendorProfiles.verificationStatus })
    .from(schema.trucks)
    .innerJoin(schema.vendorProfiles, eq(schema.vendorProfiles.id, schema.trucks.vendorId))
    .where(eq(schema.trucks.id, truckKey.data))
    .limit(1);
  if (!row || row.truck.archivedAt) {
    return errorState("Truck not found.");
  }
  const { truck, vendorStatus } = row;
  const [documents, photos] = await Promise.all([
    database.select().from(schema.truckDocuments).where(eq(schema.truckDocuments.truckId, truck.id)),
    database.select().from(schema.truckPhotos).where(eq(schema.truckPhotos.truckId, truck.id)),
  ]);

  if (decision.data === "approve") {
    if (truck.listingStatus !== "pending_verification") {
      return errorState("This truck is not awaiting review.");
    }
    if (vendorStatus !== "verified") {
      return errorState("Verify the vendor before approving their trucks.");
    }
    const missing = truckSubmissionChecks(documents, photos).filter((check) => !check.done);
    if (missing.length > 0) {
      return errorState(`Cannot approve: ${missing.map((check) => check.label.toLowerCase()).join("; ")}.`);
    }
    const today = todayIso();
    const pendingIds = documents
      .filter((document) => document.status === "pending" && (!document.expiryDate || document.expiryDate > today))
      .map((document) => document.id);

    await database.transaction(async (tx) => {
      if (pendingIds.length > 0) {
        await tx
          .update(schema.truckDocuments)
          .set({ status: "approved", reviewedBy: admin.id, reviewedAt: sql`now()` })
          .where(inArray(schema.truckDocuments.id, pendingIds));
      }
      await tx
        .update(schema.trucks)
        .set({ listingStatus: "active", reviewNote: noteResult.value, reviewedAt: sql`now()`, reviewedBy: admin.id })
        .where(eq(schema.trucks.id, truck.id));
      await recordAudit({ actorId: admin.id, action: "truck.approved", entityType: "truck", entityId: truck.id, metadata: { approvedDocuments: pendingIds.length } }, tx);
    });
    after(() => notifyTruckReview("truck.approved", truck.vendorId, truck.id, truck.registrationNumber, null));
    refresh();
    return successState("Truck approved and active.");
  }

  if (decision.data === "request_changes") {
    if (truck.listingStatus !== "pending_verification") {
      return errorState("This truck is not awaiting review.");
    }
    await database
      .update(schema.trucks)
      .set({ listingStatus: "draft", submittedAt: null, reviewNote: noteResult.value, reviewedAt: sql`now()`, reviewedBy: admin.id })
      .where(eq(schema.trucks.id, truck.id));
    await recordAudit({ actorId: admin.id, action: "truck.changes_requested", entityType: "truck", entityId: truck.id, metadata: { note: noteResult.value } });
    after(() => notifyTruckReview("truck.changes_requested", truck.vendorId, truck.id, truck.registrationNumber, noteResult.value));
    refresh();
    return successState("Changes requested from the vendor.");
  }

  if (decision.data === "suspend") {
    if (truck.listingStatus === "suspended" || truck.listingStatus === "archived") {
      return errorState("This truck is already suspended.");
    }
    await database
      .update(schema.trucks)
      .set({ listingStatus: "suspended", reviewNote: noteResult.value, reviewedAt: sql`now()`, reviewedBy: admin.id })
      .where(eq(schema.trucks.id, truck.id));
    await recordAudit({
      actorId: admin.id,
      action: "truck.suspended",
      entityType: "truck",
      entityId: truck.id,
      metadata: { note: noteResult.value, previousStatus: truck.listingStatus },
    });
    refresh();
    return successState("Truck suspended.");
  }

  if (truck.listingStatus !== "suspended") {
    return errorState("This truck is not suspended.");
  }
  const ready = vendorStatus === "verified" && requiredDocumentsApproved(documents) && photos.length >= MIN_TRUCK_PHOTOS;
  await database
    .update(schema.trucks)
    .set(
      ready
        ? { listingStatus: "active", reviewNote: null, reviewedAt: sql`now()`, reviewedBy: admin.id }
        : { listingStatus: "draft", submittedAt: null, reviewNote: "Reinstated. Update any expired documents and submit the truck for review again.", reviewedAt: sql`now()`, reviewedBy: admin.id },
    )
    .where(eq(schema.trucks.id, truck.id));
  await recordAudit({ actorId: admin.id, action: "truck.reinstated", entityType: "truck", entityId: truck.id, metadata: { reactivated: ready } });
  refresh();
  return successState(ready ? "Truck reinstated and active." : "Truck reinstated to draft. The vendor must resubmit current documents.");
}

export async function reviewTruckDocumentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const documentId = id.safeParse(formData.get("documentId"));
  const decision = z.enum(["approve", "reject"]).safeParse(formData.get("decision"));
  if (!documentId.success || !decision.success) {
    return errorState("Choose a decision.");
  }
  const reason = readNote(formData, decision.data === "reject");
  if (!reason.ok) {
    return reason.state;
  }

  const database = db();
  const result = await database.transaction(async (tx) => {
    const [document] = await tx
      .update(schema.truckDocuments)
      .set({
        status: decision.data === "approve" ? "approved" : "rejected",
        rejectionReason: decision.data === "reject" ? reason.value : null,
        reviewedBy: admin.id,
        reviewedAt: sql`now()`,
      })
      .where(eq(schema.truckDocuments.id, documentId.data))
      .returning({ id: schema.truckDocuments.id, truckId: schema.truckDocuments.truckId });
    if (!document) {
      return null;
    }

    let restored = false;
    if (decision.data === "approve") {
      const [truck] = await tx.select().from(schema.trucks).where(eq(schema.trucks.id, document.truckId)).limit(1);
      if (truck?.listingStatus === "expired_documentation") {
        const documents = await tx.select().from(schema.truckDocuments).where(eq(schema.truckDocuments.truckId, truck.id));
        if (requiredDocumentsApproved(documents)) {
          await tx.update(schema.trucks).set({ listingStatus: "active" }).where(eq(schema.trucks.id, truck.id));
          restored = true;
        }
      }
    }

    await recordAudit(
      {
        actorId: admin.id,
        action: decision.data === "approve" ? "truck_document.approved" : "truck_document.rejected",
        entityType: "truck_document",
        entityId: document.id,
        metadata: { truckId: document.truckId, reason: reason.value, truckRestored: restored },
      },
      tx,
    );
    return { restored };
  });

  if (!result) {
    return errorState("Document not found.");
  }
  refresh();
  return successState(result.restored ? "Document approved. The truck is active again." : decision.data === "approve" ? "Document approved." : "Document rejected.");
}

export async function setUserStatusAction(formData: FormData): Promise<void> {
  const admin = await requireRole("admin");
  const userId = id.safeParse(formData.get("userId"));
  const status = z.enum(["active", "suspended"]).safeParse(formData.get("status"));
  if (!userId.success || !status.success || userId.data === admin.id) {
    return;
  }

  const [updated] = await db()
    .update(schema.users)
    .set({ status: status.data })
    .where(eq(schema.users.id, userId.data))
    .returning({ id: schema.users.id });
  if (!updated) {
    return;
  }
  if (status.data === "suspended") {
    await destroyAllSessionsFor(updated.id);
  }
  await recordAudit({ actorId: admin.id, action: status.data === "suspended" ? "user.suspended" : "user.reactivated", entityType: "user", entityId: updated.id });
  refresh();
}
