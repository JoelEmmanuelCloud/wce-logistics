"use server";

import { and, count, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { errorState, snapshot, successState, validationErrorState, type FormState } from "@/lib/form-state";
import { normalizeRegistration, truckDocumentSchema, truckSchema } from "@/lib/validation/truck";
import { recordAudit } from "@/server/audit";
import { requireRole } from "@/server/auth/dal";
import { db, schema } from "@/server/db";
import type { Truck } from "@/server/db/schema";
import { deleteStoredObject, storeUpload, UploadRejectedError } from "@/server/storage";
import {
  DETAILS_EDITABLE_STATUSES,
  DOCUMENTS_EDITABLE_STATUSES,
  findVendorTruck,
  listTruckDocuments,
  listTruckPhotos,
  MAX_TRUCK_PHOTOS,
  MIN_TRUCK_PHOTOS,
  truckSubmissionChecks,
} from "@/server/trucks";
import { findVendorProfileByUser } from "@/server/vendors";

const truckIdSchema = z.uuid();

function readTruckForm(formData: FormData) {
  return {
    registrationNumber: formData.get("registrationNumber") ?? "",
    make: formData.get("make") ?? "",
    model: formData.get("model") ?? "",
    year: formData.get("year") ?? "",
    category: formData.get("category") ?? "",
    tyreCount: formData.get("tyreCount") ?? "",
    maxPayloadKg: formData.get("maxPayloadKg") ?? "",
    bodyType: formData.get("bodyType") ?? "",
    bodyLengthM: formData.get("bodyLengthM") ?? "",
    bodyWidthM: formData.get("bodyWidthM") ?? "",
    bodyHeightM: formData.get("bodyHeightM") ?? "",
    cargoTypes: formData.getAll("cargoTypes").map(String),
    baseState: formData.get("baseState") ?? "",
    baseCity: formData.get("baseCity") ?? "",
  };
}

function duplicateRegistration(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string; constraint_name?: string } })?.cause;
  return cause?.code === "23505" && cause.constraint_name === "trucks_registration_active_key";
}

const DUPLICATE_MESSAGE = "This registration number is already listed. Contact support if this truck belongs to you.";

async function requireVendorProfile(userId: string) {
  const profile = await findVendorProfileByUser(userId);
  if (!profile) {
    redirect("/vendor/profile");
  }
  return profile;
}

async function requireOwnedTruck(truckId: unknown) {
  const user = await requireRole("vendor");
  const profile = await requireVendorProfile(user.id);
  const id = truckIdSchema.safeParse(truckId);
  const truck = id.success ? await findVendorTruck(profile.id, id.data) : null;
  if (!truck) {
    redirect("/vendor/trucks");
  }
  return { user, profile, truck };
}

export async function createTruckAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("vendor");
  const profile = await requireVendorProfile(user.id);
  if (profile.verificationStatus === "suspended" || profile.verificationStatus === "rejected") {
    return errorState("Your vendor account cannot register trucks right now. Check your verification status.");
  }

  const parsed = truckSchema.safeParse(readTruckForm(formData));
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }

  let truckId: string;
  try {
    const [truck] = await db()
      .insert(schema.trucks)
      .values({ ...parsed.data, vendorId: profile.id, registrationNormalized: normalizeRegistration(parsed.data.registrationNumber) })
      .returning({ id: schema.trucks.id });
    truckId = truck.id;
  } catch (error) {
    if (duplicateRegistration(error)) {
      return { ...errorState("Please correct the highlighted fields.", { registrationNumber: [DUPLICATE_MESSAGE] }), values: snapshot(formData) };
    }
    throw error;
  }

  await recordAudit({
    actorId: user.id,
    action: "truck.created",
    entityType: "truck",
    entityId: truckId,
    metadata: { registrationNumber: parsed.data.registrationNumber },
  });
  redirect(`/vendor/trucks/${truckId}`);
}

export async function updateTruckAction(truckId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const { user, truck } = await requireOwnedTruck(truckId);
  if (!DETAILS_EDITABLE_STATUSES.includes(truck.listingStatus)) {
    return errorState("This truck cannot be edited while it is being reviewed or suspended.");
  }

  const parsed = truckSchema.safeParse(readTruckForm(formData));
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }

  const next = { ...parsed.data, registrationNormalized: normalizeRegistration(parsed.data.registrationNumber) };
  const changed = (Object.keys(next) as Array<keyof typeof next>).filter(
    (key) => JSON.stringify(next[key]) !== JSON.stringify(truck[key as keyof Truck]),
  );
  if (changed.length === 0) {
    return successState("No changes to save.");
  }

  const needsReview = truck.listingStatus !== "draft";
  try {
    await db()
      .update(schema.trucks)
      .set({ ...next, ...(needsReview ? { listingStatus: "draft" as const, submittedAt: null } : {}) })
      .where(eq(schema.trucks.id, truck.id));
  } catch (error) {
    if (duplicateRegistration(error)) {
      return { ...errorState("Please correct the highlighted fields.", { registrationNumber: [DUPLICATE_MESSAGE] }), values: snapshot(formData) };
    }
    throw error;
  }

  await recordAudit({
    actorId: user.id,
    action: "truck.updated",
    entityType: "truck",
    entityId: truck.id,
    metadata: { changedFields: changed, previousStatus: truck.listingStatus },
  });
  refresh();
  return successState(needsReview ? "Changes saved. Submit the truck for review again to make it bookable." : "Truck details saved.");
}

export async function uploadTruckDocumentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { user, truck } = await requireOwnedTruck(formData.get("truckId"));
  if (!DOCUMENTS_EDITABLE_STATUSES.includes(truck.listingStatus)) {
    return errorState("Documents cannot be changed while this truck is suspended.");
  }

  const parsed = truckDocumentSchema.safeParse({
    truckId: formData.get("truckId"),
    type: formData.get("type"),
    issueDate: formData.get("issueDate") ?? "",
    expiryDate: formData.get("expiryDate") ?? "",
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorState("Choose a file to upload.", { file: ["Choose a file to upload."] });
  }

  try {
    const stored = await storeUpload(file, `trucks/${truck.id}/documents`, "document");
    const [document] = await db()
      .insert(schema.truckDocuments)
      .values({
        truckId: truck.id,
        type: parsed.data.type,
        issueDate: parsed.data.issueDate,
        expiryDate: parsed.data.expiryDate,
        ...stored,
      })
      .returning({ id: schema.truckDocuments.id });
    await recordAudit({
      actorId: user.id,
      action: "truck.document_uploaded",
      entityType: "truck_document",
      entityId: document.id,
      metadata: { truckId: truck.id, type: parsed.data.type, expiryDate: parsed.data.expiryDate },
    });
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      return { ...errorState(error.message, { file: [error.message] }), values: snapshot(formData) };
    }
    throw error;
  }

  refresh();
  return successState("Document uploaded. Our team will review it.");
}

export async function uploadTruckPhotoAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const { user, truck } = await requireOwnedTruck(formData.get("truckId"));
  if (!DOCUMENTS_EDITABLE_STATUSES.includes(truck.listingStatus)) {
    return errorState("Photos cannot be changed while this truck is suspended.");
  }

  const [existing] = await db().select({ value: count() }).from(schema.truckPhotos).where(eq(schema.truckPhotos.truckId, truck.id));
  if ((existing?.value ?? 0) >= MAX_TRUCK_PHOTOS) {
    return errorState(`You can upload up to ${MAX_TRUCK_PHOTOS} photos per truck. Remove one to add another.`);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorState("Choose a photo to upload.", { file: ["Choose a photo to upload."] });
  }

  try {
    const stored = await storeUpload(file, `trucks/${truck.id}/photos`, "image");
    const [photo] = await db()
      .insert(schema.truckPhotos)
      .values({ truckId: truck.id, storageKey: stored.storageKey, contentType: stored.contentType, sizeBytes: stored.sizeBytes })
      .returning({ id: schema.truckPhotos.id });
    await recordAudit({ actorId: user.id, action: "truck.photo_uploaded", entityType: "truck_photo", entityId: photo.id, metadata: { truckId: truck.id } });
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      return errorState(error.message, { file: [error.message] });
    }
    throw error;
  }

  refresh();
  return successState("Photo added.");
}

export async function deleteTruckPhotoAction(formData: FormData): Promise<void> {
  const { user, truck } = await requireOwnedTruck(formData.get("truckId"));
  const photoId = truckIdSchema.safeParse(formData.get("photoId"));
  if (!photoId.success || !DOCUMENTS_EDITABLE_STATUSES.includes(truck.listingStatus)) {
    return;
  }

  const photos = await listTruckPhotos(truck.id);
  if (truck.listingStatus !== "draft" && photos.length <= MIN_TRUCK_PHOTOS) {
    return;
  }

  const [deleted] = await db()
    .delete(schema.truckPhotos)
    .where(and(eq(schema.truckPhotos.id, photoId.data), eq(schema.truckPhotos.truckId, truck.id)))
    .returning();
  if (deleted) {
    await deleteStoredObject(deleted.storageKey);
    await recordAudit({ actorId: user.id, action: "truck.photo_deleted", entityType: "truck_photo", entityId: deleted.id, metadata: { truckId: truck.id } });
  }
  refresh();
}

export async function submitTruckForReviewAction(truckId: string): Promise<FormState> {
  const { user, profile, truck } = await requireOwnedTruck(truckId);
  if (truck.listingStatus !== "draft") {
    return errorState("This truck has already been submitted.");
  }
  if (profile.verificationStatus === "suspended" || profile.verificationStatus === "rejected") {
    return errorState("Your vendor account must be in good standing before trucks can be reviewed.");
  }

  const checks = truckSubmissionChecks(await listTruckDocuments(truck.id), await listTruckPhotos(truck.id));
  const missing = checks.filter((check) => !check.done);
  if (missing.length > 0) {
    return errorState(`Complete these first: ${missing.map((check) => check.label.toLowerCase()).join("; ")}.`);
  }

  const [updated] = await db()
    .update(schema.trucks)
    .set({ listingStatus: "pending_verification", submittedAt: sql`now()`, reviewNote: null })
    .where(and(eq(schema.trucks.id, truck.id), eq(schema.trucks.listingStatus, "draft")))
    .returning({ id: schema.trucks.id });
  if (!updated) {
    return errorState("This truck changed while you were submitting. Refresh and try again.");
  }

  await recordAudit({ actorId: user.id, action: "truck.submitted", entityType: "truck", entityId: truck.id });
  refresh();
  return successState("Submitted for review.");
}

export async function setTruckAvailabilityAction(formData: FormData): Promise<void> {
  const { user, truck } = await requireOwnedTruck(formData.get("truckId"));
  const available = formData.get("available") === "true";
  const from = available ? "unavailable" : "active";
  const to = available ? "active" : "unavailable";
  if (truck.listingStatus !== from) {
    return;
  }

  await db()
    .update(schema.trucks)
    .set({ listingStatus: to })
    .where(and(eq(schema.trucks.id, truck.id), eq(schema.trucks.listingStatus, from)));
  await recordAudit({ actorId: user.id, action: available ? "truck.marked_available" : "truck.marked_unavailable", entityType: "truck", entityId: truck.id });
  refresh();
}

export async function archiveTruckAction(formData: FormData): Promise<void> {
  const { user, truck } = await requireOwnedTruck(formData.get("truckId"));
  if (truck.listingStatus === "pending_verification" || truck.listingStatus === "suspended") {
    return;
  }

  await db()
    .update(schema.trucks)
    .set({ listingStatus: "archived", archivedAt: sql`now()` })
    .where(eq(schema.trucks.id, truck.id));
  await recordAudit({ actorId: user.id, action: "truck.archived", entityType: "truck", entityId: truck.id, metadata: { previousStatus: truck.listingStatus } });
  redirect("/vendor/trucks");
}
