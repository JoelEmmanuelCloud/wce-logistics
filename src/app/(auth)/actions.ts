"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { maskEmail, normalizeEmail } from "@/lib/email-address";
import { errorState, validationErrorState, type FormState } from "@/lib/form-state";
import { normalizePhone } from "@/lib/phone";
import { returnPathFrom } from "@/lib/shop";
import { recordAudit } from "@/server/audit";
import { getCurrentUser, homePathFor, onboardingPathFor, requireUser, signUpRoleFrom } from "@/server/auth/dal";
import { OTP_LENGTH, OTP_RESEND_SECONDS, requestOtp, verifyOtp } from "@/server/auth/otp";
import { createSession, destroySession } from "@/server/auth/session";
import { db, schema } from "@/server/db";
import type { User } from "@/server/db/schema";
import { EmailDeliveryError } from "@/server/email";
import { requestMeta } from "@/server/request";

export type SignInState = FormState & { step: "email" | "code"; email?: string; maskedEmail?: string; resendAt?: number };

const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your email address.")
    .transform((value, context) => {
      const normalized = normalizeEmail(value);
      if (!normalized) {
        context.addIssue({ code: "custom", message: "Enter a valid email address, for example ada@company.ng." });
        return z.NEVER;
      }
      return normalized;
    }),
});

const codeSchema = z.object({
  email: z.email("Your session expired. Request a new code."),
  code: z
    .string()
    .trim()
    .regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), `Enter the ${OTP_LENGTH}-digit code we sent you.`),
});

export async function requestCodeAction(_previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = emailSchema.safeParse({ email: formData.get("email") ?? "" });
  if (!parsed.success) {
    return { ...validationErrorState(parsed.error, formData), step: "email" };
  }
  const email = parsed.data.email;
  const { ipAddress } = await requestMeta();

  try {
    const result = await requestOtp(email, ipAddress);
    if (!result.ok && result.reason === "too_soon") {
      return {
        status: "error",
        message: `Please wait ${result.retryAfterSeconds} seconds before requesting another code.`,
        step: "code",
        email,
        maskedEmail: maskEmail(email),
        resendAt: Date.now() + result.retryAfterSeconds * 1000,
      };
    }
    if (!result.ok) {
      return { ...errorState("Too many code requests. Please try again in an hour."), step: "email", email };
    }
  } catch (error) {
    if (error instanceof EmailDeliveryError) {
      console.error(error);
      return { ...errorState("We could not send a code to that address. Check it and try again."), step: "email", email };
    }
    throw error;
  }

  return {
    status: "success",
    message: `We emailed a ${OTP_LENGTH}-digit code to ${maskEmail(email)}. Check your inbox and spam folder.`,
    step: "code",
    email,
    maskedEmail: maskEmail(email),
    resendAt: Date.now() + OTP_RESEND_SECONDS * 1000,
  };
}

async function findOrCreateUser(email: string): Promise<User> {
  const database = db();
  const [existing] = await database.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing) {
    const [updated] = await database.update(schema.users).set({ lastSignInAt: sql`now()` }).where(eq(schema.users.id, existing.id)).returning();
    return updated;
  }
  try {
    const [created] = await database.insert(schema.users).values({ email, lastSignInAt: sql`now()` }).returning();
    return created;
  } catch (error) {
    const [raced] = await database.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (raced) {
      return raced;
    }
    throw error;
  }
}

export async function verifyCodeAction(previous: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = codeSchema.safeParse({ email: formData.get("email") ?? "", code: formData.get("code") ?? "" });
  if (!parsed.success) {
    return { ...validationErrorState(parsed.error), step: "code", email: previous.email, maskedEmail: previous.maskedEmail };
  }
  const { email, code } = parsed.data;
  const context = { step: "code" as const, email, maskedEmail: maskEmail(email) };

  const result = await verifyOtp(email, code);
  if (!result.ok) {
    const message = {
      invalid: "That code is not correct. Check the email and try again.",
      expired: "That code has expired. Request a new one.",
      locked: "Too many incorrect attempts. Request a new code.",
    }[result.reason];
    return { ...errorState(message, result.reason === "invalid" ? { code: [message] } : undefined), ...context };
  }

  const user = await findOrCreateUser(email);
  if (user.status !== "active") {
    return { ...errorState("This account has been suspended. Contact WCE Logistics support."), ...context };
  }

  await createSession(user.id);
  await recordAudit({ actorId: user.id, action: "auth.sign_in", entityType: "user", entityId: user.id });
  const next = returnPathFrom(formData.get("next"));
  if (user.role) {
    redirect(user.role === "customer" && next ? next : homePathFor(user));
  }
  redirect(onboardingPathFor(signUpRoleFrom(formData.get("as")), next));
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
  phone: z
    .string()
    .trim()
    .min(1, "Enter a mobile number so the other party can reach you about pickups.")
    .transform((value, context) => {
      const normalized = normalizePhone(value);
      if (!normalized) {
        context.addIssue({ code: "custom", message: "Enter a valid mobile number, for example 0803 123 4567." });
        return z.NEVER;
      }
      return normalized;
    }),
  role: z.enum(["customer", "vendor"], { message: "Choose how you will use WCE Logistics." }),
});

export async function completeOnboardingAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role) {
    redirect(homePathFor(user));
  }

  const parsed = onboardingSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    role: formData.get("role") ?? "",
  });
  if (!parsed.success) {
    return validationErrorState(parsed.error, formData);
  }

  const { fullName, phone, role } = parsed.data;
  const [updated] = await db()
    .update(schema.users)
    .set({ fullName, phone, role })
    .where(and(eq(schema.users.id, user.id), isNull(schema.users.role)))
    .returning();

  await recordAudit({ actorId: user.id, action: "user.onboarded", entityType: "user", entityId: user.id, metadata: { role } });
  const next = returnPathFrom(formData.get("next"));
  redirect(role === "customer" && next ? next : homePathFor(updated ?? user));
}
