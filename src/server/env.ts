import "server-only";
import { z } from "zod";

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
    SMS_PROVIDER: z.enum(["termii", "log"]),
    TERMII_API_KEY: z.string().optional(),
    TERMII_SENDER_ID: z.string().optional(),
    TERMII_BASE_URL: z.url().default("https://api.ng.termii.com"),
    STORAGE_ENDPOINT: z.url().optional().or(z.literal("")),
    STORAGE_REGION: z.string().min(1),
    STORAGE_BUCKET: z.string().min(3),
    STORAGE_ACCESS_KEY_ID: z.string().min(1),
    STORAGE_SECRET_ACCESS_KEY: z.string().min(1),
    STORAGE_FORCE_PATH_STYLE: z.enum(["true", "false"]).default("false"),
  })
  .superRefine((value, context) => {
    if (value.SMS_PROVIDER === "termii" && (!value.TERMII_API_KEY || !value.TERMII_SENDER_ID)) {
      context.addIssue({ code: "custom", path: ["TERMII_API_KEY"], message: "TERMII_API_KEY and TERMII_SENDER_ID are required for the termii provider" });
    }
    if (value.SMS_PROVIDER === "log" && value.NODE_ENV === "production") {
      context.addIssue({ code: "custom", path: ["SMS_PROVIDER"], message: "the log SMS provider cannot be used in production" });
    }
  });

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (cached) {
    return cached;
  }
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Invalid server environment: ${details}`);
  }
  cached = parsed.data;
  return cached;
}
