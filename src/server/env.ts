import "server-only";
import { z } from "zod";
import { databaseUrl } from "@/server/db/connection";

const base64Key = z
  .string()
  .min(1)
  .refine((value) => Buffer.from(value, "base64").length === 32, "must be 32 bytes encoded as base64");

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
    DATA_ENCRYPTION_KEY: base64Key,
    EMAIL_PROVIDER: z.enum(["resend", "log"]),
    EMAIL_FROM: z.string().min(3, "must be a sender such as WCE Logistics <noreply@wcelogistics.com>"),
    RESEND_API_KEY: z.string().optional(),
    RESEND_BASE_URL: z.url().default("https://api.resend.com"),
    STORAGE_ENDPOINT: z.url().optional().or(z.literal("")),
    STORAGE_REGION: z.string().min(1),
    STORAGE_BUCKET: z.string().min(3),
    STORAGE_ACCESS_KEY_ID: z.string().min(1),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
    STORAGE_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),
    PAYSTACK_SECRET_KEY: z
      .string()
      .regex(/^sk_(test|live)_\w+$/, "must be a Paystack secret key starting with sk_test_ or sk_live_")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    PAYSTACK_BASE_URL: z.url().default("https://api.paystack.co"),
    PLATFORM_COMMISSION_BPS: z.coerce.number().int().min(0).max(5000),
    CRON_SECRET: z.string().min(32, "must be at least 32 characters").optional().or(z.literal("").transform(() => undefined)),
  })
  .superRefine((value, context) => {
    if (value.EMAIL_PROVIDER === "resend" && !value.RESEND_API_KEY) {
      context.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "RESEND_API_KEY is required for the resend provider" });
    }
    if (value.EMAIL_PROVIDER === "log" && value.NODE_ENV === "production") {
      context.addIssue({ code: "custom", path: ["EMAIL_PROVIDER"], message: "the log email provider cannot be used in production" });
    }
  });

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) {
    return cached;
  }
  const parsed = schema.safeParse({ ...process.env, DATABASE_URL: databaseUrl(process.env, "app") });
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }
  cached = parsed.data;
  return cached;
}
