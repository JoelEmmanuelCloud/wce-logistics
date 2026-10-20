import { z } from "zod";

const emailSchema = z.email();

export function normalizeEmail(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (value.length > 254 || !emailSchema.safeParse(value).success) {
    return null;
  }
  return value;
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) {
    return email;
  }
  const visible = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${visible}${"•".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}
