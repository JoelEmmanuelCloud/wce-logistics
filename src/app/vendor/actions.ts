"use server";

import { and, eq, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { errorState, successState, validationErrorState, withValues, type FormState } from "@/lib/form-state";
import { identitySchema, vendorDocumentTypeSchema, vendorProfileSchema } from "@/lib/validation/vendor";
import { recordAudit } from "@/server/audit";
import { requireRole } from "@/server/auth/dal";
import { encrypt } from "@/server/crypto";
import { db, schema } from "@/server/db";
import { storeUpload, UploadRejectedError } from "@/server/storage";
import {
  findVendorProfileByUser,
  listVendorDocuments,
  vendorIsEditable,
  vendorSubmissionChecks,
} from "@/server/vendors";

const LOCKED_MESSAGE = "Your details are locked while our team reviews them.";

function isUniqueViolation(error: unknown, constraint: string): boolean {
  const cause = (error as { cause?: { code?: string; constraint_name?: string } })?.cause ?? (error as { code?: string; constraint_name?: string });
  return cause?.code === "23505" && cause?.constraint_name === constraint;
}

export async function saveVendorProfileAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("vendor");
  const parsed = vendorProfileSchema.safeParse({
    category: formData.get("category") ?? "",
    legalName: formData.get("legalName") ?? "",
    businessName: formData.get("businessName") ?? "",
    email: formData.get("email") ?? "",
    addressLine: formData.get("addressLine") ?? "",
    city: formData.get("city") ?? "",
    state: formData.get("state") ?? "",
    operatingStates: formData.getAll("operatingStates").map(String),
    cacNumber: formData.get("cacNumber") ?? "",
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }

  const values = { ...parsed.data, cacNumber: parsed.data.category === "logistics_company" ? parsed.data.cacNumber : null };
  const existing = await findVendorProfileByUser(user.id);
  if (existing && !vendorIsEditable(existing)) {
    return errorState(LOCKED_MESSAGE);
  }

  try {
    if (existing) {
      await db().update(schema.vendorProfiles).set(values).where(eq(schema.vendorProfiles.id, existing.id));
      await recordAudit({ actorId: user.id, action: "vendor.profile_updated", entityType: "vendor", entityId: existing.id });
    } else {
      const [created] = await db()
        .insert(schema.vendorProfiles)
        .values({ ...values, userId: user.id })
        .returning({ id: schema.vendorProfiles.id });
      await recordAudit({ actorId: user.id, action: "vendor.profile_created", entityType: "vendor", entityId: created.id });
    }
  } catch (error) {
    if (isUniqueViolation(error, "vendor_profiles_cac_number_key")) {
      return withValues(errorState("Please correct the highlighted fields.", {
          cacNumber: ["This CAC number is already registered. Contact support if you believe this is a mistake."],
        }), formData);
    }
    throw error;
  }

  if (!existing) {
    redirect("/vendor/verification");
  }
  refresh();
  return successState("Business profile saved.");
}

async function requireEditableProfile(userId: string) {
  const profile = await findVendorProfileByUser(userId);
  if (!profile) {
    redirect("/vendor/profile");
  }
  return profile;
}

export async function saveIdentityAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("vendor");
  const profile = await requireEditableProfile(user.id);
  if (!vendorIsEditable(profile)) {
    return errorState(LOCKED_MESSAGE);
  }

  const parsed = identitySchema.safeParse({
    idDocumentType: formData.get("idDocumentType") ?? "",
    idDocumentReference: (formData.get("idDocumentReference") ?? "").toString().replace(/\s+/g, ""),
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }

  const reference = parsed.data.idDocumentReference;
  await db()
    .update(schema.vendorProfiles)
    .set({
      idDocumentType: parsed.data.idDocumentType,
      idDocumentReferenceEncrypted: encrypt(reference),
      idDocumentReferenceLast4: reference.slice(-4),
    })
    .where(eq(schema.vendorProfiles.id, profile.id));
  await recordAudit({ actorId: user.id, action: "vendor.identity_updated", entityType: "vendor", entityId: profile.id });
  refresh();
  return successState("Identity details saved securely.");
}

export async function uploadVendorDocumentAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireRole("vendor");
  const profile = await requireEditableProfile(user.id);
  if (!vendorIsEditable(profile)) {
    return errorState(LOCKED_MESSAGE);
  }

  const type = vendorDocumentTypeSchema.safeParse(formData.get("type"));
  if (!type.success) {
    return errorState("Choose a document type.");
  }
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorState("Choose a file to upload.", { file: ["Choose a file to upload."] });
  }

  try {
    const stored = await storeUpload(file, `vendors/${profile.id}`, "document");
    const [document] = await db()
      .insert(schema.vendorDocuments)
      .values({ vendorId: profile.id, type: type.data, ...stored })
      .returning({ id: schema.vendorDocuments.id });
    await recordAudit({
      actorId: user.id,
      action: "vendor.document_uploaded",
      entityType: "vendor_document",
      entityId: document.id,
      metadata: { type: type.data, vendorId: profile.id },
    });
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      return errorState(error.message, { file: [error.message] });
    }
    throw error;
  }

  refresh();
  return successState("Document uploaded.");
}

export async function submitVendorForReviewAction(): Promise<FormState> {
  const user = await requireRole("vendor");
  const profile = await requireEditableProfile(user.id);
  if (!vendorIsEditable(profile)) {
    return errorState("Your application has already been submitted.");
  }

  const checks = vendorSubmissionChecks(profile, await listVendorDocuments(profile.id));
  const missing = checks.filter((check) => !check.done);
  if (missing.length > 0) {
    return errorState(`Complete these steps first: ${missing.map((check) => check.label.toLowerCase()).join(", ")}.`);
  }

  const [updated] = await db()
    .update(schema.vendorProfiles)
    .set({ verificationStatus: "submitted", submittedAt: sql`now()`, reviewNote: null })
    .where(and(eq(schema.vendorProfiles.id, profile.id), eq(schema.vendorProfiles.verificationStatus, profile.verificationStatus)))
    .returning({ id: schema.vendorProfiles.id });
  if (!updated) {
    return errorState("Your application changed while you were submitting. Refresh and try again.");
  }

  await recordAudit({ actorId: user.id, action: "vendor.submitted", entityType: "vendor", entityId: profile.id });
  refresh();
  return successState("Submitted for review. Our team will check your details, and the outcome will appear on this page.");
}
