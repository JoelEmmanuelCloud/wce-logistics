"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { errorState, successState, type FormState } from "@/lib/form-state";
import { requireRole } from "@/server/auth/dal";
import { ReviewError, setReviewStatus } from "@/server/reviews";

const id = z.uuid();

export async function setReviewStatusAction(reviewId: string, status: "published" | "hidden", _previous: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireRole("admin");
  const note = z.string().trim().min(5, "Give a short reason.").max(500).safeParse(formData.get("reason") ?? "");
  if (!id.safeParse(reviewId).success) {
    return errorState("Review not found.");
  }
  if (!note.success) {
    return errorState(note.error.issues[0].message, { reason: [note.error.issues[0].message] });
  }
  try {
    await setReviewStatus(admin.id, reviewId, status, note.data);
  } catch (error) {
    if (error instanceof ReviewError) {
      return errorState(error.message);
    }
    throw error;
  }
  refresh();
  return successState(status === "hidden" ? "Review hidden." : "Review published again.");
}
