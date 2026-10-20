"use server";

import { eq, isNull, and, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { errorState, snapshot, validationErrorState, type FormState } from "@/lib/form-state";
import { maskPhone, normalizePhone } from "@/lib/phone";
import { recordAudit } from "@/server/audit";
import { getCurrentUser, homePathFor, requireUser } from "@/server/auth/dal";
import { OTP_LENGTH, OTP_RESEND_SECONDS, requestOtp, verifyOtp } from "@/server/auth/otp";
import { createSession, destroySession } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import { requestMeta } from "@/server/request";
import { SmsDeliveryError } from "@/server/sms";

export type SignInState = FormState & { step: "phone" | "code"; phone?: string; maskedPhone?: string; resendAt?: number };

const phoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "Enter your phone number.")
    .transform((value, context) => {
      const normalized = normalizePhone(value);
      if (!normalized) {
        context.addIssue({ code: "custom", message: "Enter a valid mobile number, for example 0803 123 4567." });
        return z.NEVER;
      }
      return normalized;
    }),
});

const codeSchema = z.object({
  phone: z.string().regex(/^\+\d{8,15}$/, "Your session expired. Request a new code."),
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code we sent you.`),
});

export async function requestCodeAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = phoneSchema.safeParse({ phone: formData.get("phone") ?? "" });
  if (!parsed.success) {
    return { ...validationErrorState(parsed.error), step: "phone" };
  }
  const phone = parsed.data.phone;
  const { ipAddress } = await requestMeta();

  try {
    const result = await requestOtp(phone, ipAddress);
    if (!result.ok && result.reason === "too_soon") {
      return {
        status: "error",
        message: `Please wait ${result.retryAfterSeconds} seconds before requesting another code.`,
        step: "code",
        phone,
        maskedPhone: maskPhone(phone),
        resendAt: Date.now() + result.retryAfterSeconds * 1000,
      };
    }
    if (!result.ok) {
      return { ...errorState("Too many code requests. Please try again in an hour."), step: "phone" };
    }
  } catch (error) {
    if (error instanceof SmsDeliveryError) {
      console.error(error);
      return { ...errorState("We could not send a code to that number. Check it and try again."), step: "phone" };
    }
    throw error;
  }

  return {
    status: "success",
    message: `We sent a ${OTP_LENGTH}-digit code to ${maskPhone(phone)}.`,
    step: "code",
    phone,
    maskedPhone: maskPhone(phone),
    resendAt: Date.now() + OTP_RESEND_SECONDS * 1000,
  };
}

export async function verifyCodeAction(previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = codeSchema.safeParse({ phone: formData.get("phone") ?? "", code: formData.get("code") ?? "" });
  if (!parsed.success) {
    return { ...validationErrorState(parsed.error), step: "code", phone: previous.phone, maskedPhone: previous.maskedPhone };
  }
  const { phone, code } = parsed.data;
  const context = { step: "code" as const, phone, maskedPhone: maskPhone(phone) };

  const result = await verifyOtp(phone, code);
  if (!result.ok) {
    const message = {
      invalid: "That code is not correct. Check the SMS and try again.",
      expired: "That code has expired. Request a new one.",
      locked: "Too many incorrect attempts. Request a new code.",
    }[result.reason];
    return { ...errorState(message, result.reason === "invalid" ? { code: [message] } : undefined), ...context };
  }

  const [user] = await db()
    .insert(schema.users)
    .values({ phone, lastSignInAt: new Date() })
    .onConflictDoUpdate({ target: schema.users.phone, set: { lastSignInAt: sql`now()` } })
    .returning();

  if (user.status !== "active") {
    return { ...errorState("This account has been suspended. Contact WCE Logistics support."), ...context };
  }

  await createSession(user.id);
  await recordAudit({ actorId: user.id, action: "auth.sign_in", entityType: "user", entityId: user.id });
  redirect(homePathFor(user));
}

export async function signOutAction(): Promise<void> {
  const user = await getCurrentUser();
  await destroySession();
  if (user) {
    await recordAudit({ actorId: user.id, action: "auth.sign_out", entityType: "user", entityId: user.id });
  }
  redirect("/sign-in");
}

const onboardingSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name.").max(120, "Name is too long."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine((value) => value === "" || z.email().safeParse(value).success, "Enter a valid email address.")
    .transform((value) => (value === "" ? null : value)),
  role: z.enum(["customer", "vendor"], { message: "Choose how you will use WCE Logistics." }),
});

export async function completeOnboardingAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role) {
    redirect(homePathFor(user));
  }

  const parsed = onboardingSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    email: formData.get("email") ?? "",
    role: formData.get("role") ?? "",
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }

  const { fullName, email, role } = parsed.data;
  if (email) {
    const [existing] = await db()
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(sql`lower(${schema.users.email}) = ${email}`)
      .limit(1);
    if (existing && existing.id !== user.id) {
      return {
        ...errorState("Please correct the highlighted fields.", { email: ["This email is already linked to another account."] }),
        values: snapshot(formData),
      };
    }
  }

  const [updated] = await db()
    .update(schema.users)
    .set({ fullName, email, role })
    .where(and(eq(schema.users.id, user.id), isNull(schema.users.role)))
    .returning();

  await recordAudit({ actorId: user.id, action: "user.onboarded", entityType: "user", entityId: user.id, metadata: { role } });
  redirect(homePathFor(updated ?? user));
}
