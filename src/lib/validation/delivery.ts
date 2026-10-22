import { z } from "zod";
import { isIsoDate, lagosToday } from "@/lib/dates";
import { DELIVERY_UPDATE_KINDS } from "@/lib/delivery";
import { normalizeEmail } from "@/lib/email-address";
import { DISPUTE_CATEGORIES, LICENCE_CLASSES } from "@/lib/labels";
import { normalizePhone } from "@/lib/phone";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((value) => value || null);

const phone = z
  .string()
  .trim()
  .transform((value, context) => {
    const normalized = normalizePhone(value);
    if (!normalized) {
      context.addIssue({ code: "custom", message: "Enter a valid Nigerian mobile number." });
      return z.NEVER;
    }
    return normalized;
  });

const licenceClass = z.enum(LICENCE_CLASSES.map((option) => option.value) as [string, ...string[]], { message: "Choose the licence class." });

const licenceExpiry = z.string().refine((value) => isIsoDate(value) && value >= lagosToday(), "The licence must not be expired.");

export function normalizeLicenceNumber(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, "");
}

export const driverSchema = z.object({
  fullName: z.string().trim().min(3, "Enter the driver's full name.").max(120, "This name is too long."),
  email: z
    .string()
    .trim()
    .transform((value, context) => {
      const normalized = normalizeEmail(value);
      if (!normalized) {
        context.addIssue({ code: "custom", message: "Enter a valid email address. The driver signs in with it." });
        return z.NEVER;
      }
      return normalized;
    }),
  phone,
  licenceNumber: z
    .string()
    .transform(normalizeLicenceNumber)
    .refine((value) => /^[A-Z0-9]{8,20}$/.test(value), "Enter the licence number exactly as printed on the licence."),
  licenceClass,
  licenceExpiresOn: licenceExpiry,
});

export const driverUpdateSchema = z.object({
  phone,
  licenceClass,
  licenceExpiresOn: licenceExpiry,
});

export const deliveryUpdateSchema = z
  .object({
    kind: z.enum(DELIVERY_UPDATE_KINDS as [string, ...string[]], { message: "Choose an update." }),
    note: optionalText(500),
    recipientName: optionalText(120),
  })
  .superRefine((value, context) => {
    if (value.kind === "delivered" && (!value.recipientName || value.recipientName.length < 2)) {
      context.addIssue({ code: "custom", path: ["recipientName"], message: "Enter the name of the person who received the goods." });
    }
    if ((value.kind === "delivery_attempted" || value.kind === "incident_reported") && (!value.note || value.note.length < 5)) {
      context.addIssue({ code: "custom", path: ["note"], message: "Describe what happened." });
    }
  });

export const reviewSchema = z.object({
  rating: z.coerce.number({ message: "Choose a rating." }).int().min(1, "Choose a rating.").max(5, "Choose a rating."),
  comment: optionalText(1000),
});

export const disputeSchema = z.object({
  category: z.enum(DISPUTE_CATEGORIES.map((option) => option.value) as [string, ...string[]], { message: "Choose what went wrong." }),
  description: z.string().trim().min(20, "Describe the problem in at least 20 characters.").max(2000, "Keep this under 2,000 characters."),
});

export const disputeMessageSchema = z.object({
  body: z.string().trim().min(2, "Write a message.").max(2000, "Keep this under 2,000 characters."),
});

export const disputeStatusSchema = z
  .object({
    status: z.enum(["under_review", "awaiting_information", "resolved", "closed"], { message: "Choose a status." }),
    resolution: optionalText(2000),
  })
  .superRefine((value, context) => {
    if ((value.status === "resolved" || value.status === "closed") && (!value.resolution || value.resolution.length < 10)) {
      context.addIssue({ code: "custom", path: ["resolution"], message: "Explain the outcome in at least 10 characters." });
    }
  });
