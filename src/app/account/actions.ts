"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { successState, validationErrorState, type FormState } from "@/lib/form-state";
import { normalizePhone } from "@/lib/phone";
import { recordAudit } from "@/server/audit";
import { requireUser } from "@/server/auth/dal";
import { db, schema } from "@/server/db";

const accountSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120, "Name is too long."),
  phone: z
    .string()
    .trim()
    .min(1, "Enter a mobile number.")
    .transform((value, context) => {
      const normalized = normalizePhone(value);
      if (!normalized) {
        context.addIssue({ code: "custom", message: "Enter a valid mobile number, for example 0803 123 4567." });
        return z.NEVER;
      }
      return normalized;
    }),
});

export async function updateAccountAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = accountSchema.safeParse({ fullName: formData.get("fullName") ?? "", phone: formData.get("phone") ?? "" });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }

  await db().update(schema.users).set(parsed.data).where(eq(schema.users.id, user.id));
  await recordAudit({ actorId: user.id, action: "user.account_updated", entityType: "user", entityId: user.id });
  refresh();
  return successState("Account details saved.");
}
