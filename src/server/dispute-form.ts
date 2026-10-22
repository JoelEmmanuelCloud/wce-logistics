import "server-only";
import { refresh } from "next/cache";
import { after } from "next/server";
import { errorState, successState, validationErrorState, withValues, type FormState } from "@/lib/form-state";
import { disputeMessageSchema, disputeSchema } from "@/lib/validation/delivery";
import { addDisputeMessage, DisputeError, openDispute, type DisputeActor } from "@/server/disputes";
import { notifyDispute } from "@/server/notifications";
import { deleteStoredObject, storeUpload, UploadRejectedError, type StoredFile } from "@/server/storage";

async function readAttachment(formData: FormData, prefix: string): Promise<{ ok: true; file: StoredFile | null } | { ok: false; state: FormState }> {
  const file = formData.get("attachment");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: true, file: null };
  }
  try {
    return { ok: true, file: await storeUpload(file, prefix, "document") };
  } catch (error) {
    if (error instanceof UploadRejectedError) {
      return { ok: false, state: withValues(errorState(error.message, { attachment: [error.message] }), formData) };
    }
    throw error;
  }
}

async function discard(file: StoredFile | null) {
  if (file) {
    await deleteStoredObject(file.storageKey).catch((error) => console.error(error));
  }
}

export async function openDisputeFromForm(actor: Exclude<DisputeActor, { role: "admin" }>, bookingId: string, formData: FormData): Promise<FormState> {
  const parsed = disputeSchema.safeParse({ category: formData.get("category") ?? "", description: formData.get("description") ?? "" });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  const attachment = await readAttachment(formData, `disputes/${bookingId}`);
  if (!attachment.ok) {
    return attachment.state;
  }
  try {
    const { dispute, booking } = await openDispute(actor, bookingId, parsed.data, attachment.file);
    after(() => notifyDispute("dispute.opened", dispute, booking, actor.id));
  } catch (error) {
    await discard(attachment.file);
    if (error instanceof DisputeError) {
      return withValues(errorState(error.message), formData);
    }
    throw error;
  }
  refresh();
  return successState("Dispute opened. Our team will review it and reply here.");
}

export async function replyToDisputeFromForm(actor: DisputeActor, disputeId: string, formData: FormData): Promise<FormState> {
  const parsed = disputeMessageSchema.safeParse({ body: formData.get("body") ?? "" });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  const attachment = await readAttachment(formData, `disputes/${disputeId}`);
  if (!attachment.ok) {
    return attachment.state;
  }
  try {
    const { dispute, booking } = await addDisputeMessage(actor, disputeId, parsed.data.body, attachment.file);
    after(() => notifyDispute("dispute.message", dispute, booking, actor.id));
  } catch (error) {
    await discard(attachment.file);
    if (error instanceof DisputeError) {
      return withValues(errorState(error.message), formData);
    }
    throw error;
  }
  refresh();
  return successState("Message sent.");
}
