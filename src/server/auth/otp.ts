import "server-only";
import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { hmac, numericCode, safeEqualHex } from "@/server/crypto";
import { db, schema } from "@/server/db";
import { sendSms } from "@/server/sms";

export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;
const OTP_MAX_PER_PHONE_PER_HOUR = 5;
const OTP_MAX_PER_IP_PER_HOUR = 20;

export type RequestOtpResult =
  | { ok: true }
  | { ok: false; reason: "too_soon"; retryAfterSeconds: number }
  | { ok: false; reason: "rate_limited" };

export type VerifyOtpResult = { ok: true } | { ok: false; reason: "invalid" | "expired" | "locked" };

function codeHash(phone: string, code: string): string {
  return hmac(`otp:${phone}:${code}`);
}

export async function requestOtp(phone: string, ipAddress: string | null): Promise<RequestOtpResult> {
  const database = db();
  const hourAgo = sql`now() - interval '1 hour'`;

  const [latest] = await database
    .select({ createdAt: schema.otpChallenges.createdAt })
    .from(schema.otpChallenges)
    .where(eq(schema.otpChallenges.phone, phone))
    .orderBy(desc(schema.otpChallenges.createdAt))
    .limit(1);
  if (latest) {
    const elapsed = (Date.now() - latest.createdAt.getTime()) / 1000;
    if (elapsed < OTP_RESEND_SECONDS) {
      return { ok: false, reason: "too_soon", retryAfterSeconds: Math.ceil(OTP_RESEND_SECONDS - elapsed) };
    }
  }

  const [phoneCount] = await database
    .select({ value: count() })
    .from(schema.otpChallenges)
    .where(and(eq(schema.otpChallenges.phone, phone), gt(schema.otpChallenges.createdAt, hourAgo)));
  if ((phoneCount?.value ?? 0) >= OTP_MAX_PER_PHONE_PER_HOUR) {
    return { ok: false, reason: "rate_limited" };
  }

  if (ipAddress) {
    const [ipCount] = await database
      .select({ value: count() })
      .from(schema.otpChallenges)
      .where(and(eq(schema.otpChallenges.ipAddress, ipAddress), gt(schema.otpChallenges.createdAt, hourAgo)));
    if ((ipCount?.value ?? 0) >= OTP_MAX_PER_IP_PER_HOUR) {
      return { ok: false, reason: "rate_limited" };
    }
  }

  const code = numericCode(OTP_LENGTH);
  const [challenge] = await database
    .insert(schema.otpChallenges)
    .values({
      phone,
      codeHash: codeHash(phone, code),
      ipAddress,
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
    })
    .returning({ id: schema.otpChallenges.id });

  try {
    await sendSms(phone, `Your WCE Logistics code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Never share this code.`);
  } catch (error) {
    await database.delete(schema.otpChallenges).where(eq(schema.otpChallenges.id, challenge.id));
    throw error;
  }
  return { ok: true };
}

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  return db().transaction(async (tx) => {
    const [challenge] = await tx
      .select()
      .from(schema.otpChallenges)
      .where(and(eq(schema.otpChallenges.phone, phone), isNull(schema.otpChallenges.consumedAt)))
      .orderBy(desc(schema.otpChallenges.createdAt))
      .limit(1)
      .for("update");

    if (!challenge || challenge.expiresAt.getTime() <= Date.now()) {
      return { ok: false, reason: "expired" } as const;
    }
    if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
      return { ok: false, reason: "locked" } as const;
    }

    const matches = safeEqualHex(challenge.codeHash, codeHash(phone, code));
    await tx
      .update(schema.otpChallenges)
      .set(matches ? { attempts: challenge.attempts + 1, consumedAt: new Date() } : { attempts: challenge.attempts + 1 })
      .where(eq(schema.otpChallenges.id, challenge.id));

    if (!matches) {
      return { ok: false, reason: challenge.attempts + 1 >= OTP_MAX_ATTEMPTS ? "locked" : "invalid" } as const;
    }
    return { ok: true } as const;
  });
}
