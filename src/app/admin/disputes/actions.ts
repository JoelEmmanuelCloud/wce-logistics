"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { errorState, successState, validationErrorState, type FormState } from "@/lib/form-state";
import { disputeStatusSchema } from "@/lib/validation/delivery";
import { requireRole } from "@/server/auth/dal";
import { replyToDisputeFromForm } from "@/server/dispute-form";
import { assignDispute, DisputeError, updateDisputeStatus } from "@/server/disputes";
import { notifyDispute } from "@/server/notifications";

const id = z.uuid();

export async function assignDisputeAction(disputeId: string): Promise<FormState> {
  const admin = await requireRole("admin");
  if (!id.safeParse(disputeId).success) {
    return errorState("Dispute not found.");
  }
  try {
    await assignDispute(admin.id, disputeId);
  } catch (error) {
    if (error instanceof DisputeError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Dispute assigned to you.");
}

export async function updateDisputeStatusAction(disputeId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  if (!id.safeParse(disputeId).success) {
    return errorState("Dispute not found.");
  }
  const parsed = disputeStatusSchema.safeParse({ status: formData.get("status") ?? "", resolution: formData.get("resolution") ?? "" });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }
  try {
    const { dispute, booking } = await updateDisputeStatus(admin.id, disputeId, parsed.data);
    after(() => notifyDispute("dispute.updated", dispute, booking, null));
  } catch (error) {
    if (error instanceof DisputeError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState("Dispute updated. Both parties have been emailed.");
}

export async function adminDisputeReplyAction(disputeId: string, _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  if (!id.safeParse(disputeId).success) {
    return errorState("Dispute not found.");
  }
  return replyToDisputeFromForm({ id: admin.id, role: "admin" }, disputeId, formData);
}
