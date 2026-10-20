"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { errorState, snapshot, successState, validationErrorState, type FormState } from "@/lib/form-state";
import { recordAudit } from "@/server/audit";
import { requireUser } from "@/server/auth/dal";
import { db, schema } from "@/server/db";

const accountSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120, "Name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address.")
    .transform((value) => (value === "" ? null : value)),
});

export async function updateAccountAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = accountSchema.safeParse({ fullName: formData.get("fullName") ?? "", email: formData.get("email") ?? "" });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }

  if (parsed.data.email) {
    const [taken] = await db()
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(and(sql`lower(${schema.users.email}) = ${parsed.data.email}`, ne(schema.users.id, user.id)))
      .limit(1);
    if (taken) {
      return {
        ...errorState("Please correct the highlighted fields.", { email: ["This email is already linked to another account."] }),
        values: snapshot(formData),
      };
    }
  }

  await db().update(schema.users).set(parsed.data).where(eq(schema.users.id, user.id));
  await recordAudit({ actorId: user.id, action: "user.account_updated", entityType: "user", entityId: user.id });
  refresh();
  return successState("Account details saved.");
}
