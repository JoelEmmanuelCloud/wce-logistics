import { z } from "zod";
import { isNigerianState } from "@/data/nigeria-states";
import { lagosToday } from "@/lib/dates";
import { BODY_TYPES, CARGO_TYPES, TRUCK_CATEGORIES } from "@/lib/labels";

const values = <T extends ReadonlyArray<{ value: string }>>(options: T) => options.map((option) => option.value) as [T[number]["value"], ...T[number]["value"][]];

export function normalizeRegistration(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const optionalMetres = z
  .string()
  .trim()
  .optional()
  .transform((value, context) => {
    if (!value) {
      return null;
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0 || number > 30) {
      context.addIssue({ code: "custom", message: "Enter a size in metres between 0.1 and 30." });
      return z.NEVER;
    }
    return number.toFixed(2);
  });

const currentYear = new Date().getFullYear();

export const truckSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .toUpperCase()
    .min(5, "Enter the vehicle registration number.")
    .max(15, "Registration number is too long.")
    .refine((value) => {
      const normalized = normalizeRegistration(value);
      return normalized.length >= 5 && /[A-Z]/.test(normalized) && /\d/.test(normalized);
    }, "Enter a valid registration number, for example KJA-123AB."),
  make: z.string().trim().min(2, "Enter the make, for example MAN or Mercedes-Benz.").max(60),
  model: z.string().trim().min(1, "Enter the model.").max(60),
  year: z
    .string()
    .trim()
    .optional()
    .transform((value, context) => {
      if (!value) {
        return null;
      }
      const year = Number(value);
      if (!Number.isInteger(year) || year < 1970 || year > currentYear + 1) {
        context.addIssue({ code: "custom", message: `Enter a year between 1970 and ${currentYear + 1}.` });
        return z.NEVER;
      }
      return year;
    }),
  category: z.enum(values(TRUCK_CATEGORIES), { message: "Choose a truck category." }),
  tyreCount: z.coerce
    .number({ message: "Enter the number of tyres." })
    .int("Enter a whole number of tyres.")
    .min(4, "A truck has at least 4 tyres.")
    .max(40, "Enter 40 tyres or fewer."),
  maxPayloadKg: z.coerce
    .number({ message: "Enter the maximum payload in kilograms." })
    .int("Enter the payload in whole kilograms.")
    .min(500, "Payload must be at least 500 kg.")
    .max(100_000, "Payload must be 100,000 kg or less."),
  bodyType: z.enum(values(BODY_TYPES), { message: "Choose a body type." }),
  bodyLengthM: optionalMetres,
  bodyWidthM: optionalMetres,
  bodyHeightM: optionalMetres,
  cargoTypes: z.array(z.enum(values(CARGO_TYPES))).min(1, "Choose at least one cargo type."),
  baseState: z.string().refine(isNigerianState, "Choose the state where the truck is based."),
  baseCity: z.string().trim().min(2, "Enter the town or city where the truck is based.").max(80),
});

export type TruckInput = z.infer<typeof truckSchema>;

export const truckDocumentSchema = z
  .object({
    truckId: z.uuid(),
    type: z.enum(["vehicle_registration", "proof_of_ownership", "vehicle_licence", "roadworthiness", "insurance", "other_permit"]),
    issueDate: z
      .string()
      .optional()
      .transform((value) => value || null),
    expiryDate: z
      .string()
      .optional()
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    const dateOk = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
    if (value.issueDate && !dateOk(value.issueDate)) {
      context.addIssue({ code: "custom", path: ["issueDate"], message: "Enter a valid issue date." });
    }
    if (value.expiryDate && !dateOk(value.expiryDate)) {
      context.addIssue({ code: "custom", path: ["expiryDate"], message: "Enter a valid expiry date." });
    }
    if (["roadworthiness", "insurance", "vehicle_licence"].includes(value.type) && !value.expiryDate) {
      context.addIssue({ code: "custom", path: ["expiryDate"], message: "Enter the expiry date shown on the document." });
    }
    if (value.expiryDate && dateOk(value.expiryDate) && value.expiryDate <= lagosToday()) {
      context.addIssue({ code: "custom", path: ["expiryDate"], message: "This document has expired. Upload a current one." });
    }
    if (value.issueDate && value.expiryDate && value.issueDate >= value.expiryDate) {
      context.addIssue({ code: "custom", path: ["expiryDate"], message: "Expiry date must be after the issue date." });
    }
  });
