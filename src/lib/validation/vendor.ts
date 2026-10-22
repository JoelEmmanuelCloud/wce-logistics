import { z } from "zod";
import { isNigerianState } from "@/data/nigeria-states";

const text = (label: string, max = 160) =>
  z
    .string()
    .trim()
    .min(2, `Enter ${label}.`)
    .max(max, `${label[0].toUpperCase()}${label.slice(1)} is too long.`);

const state = z.string().refine(isNigerianState, "Choose a state.");

export const vendorProfileSchema = z
  .object({
    category: z.enum(["individual_owner", "logistics_company", "fleet_operator"], { message: "Choose a vendor category." }),
    legalName: text("your full legal name"),
    businessName: z.string().trim().max(160).optional().transform((value) => value || null),
    email: z.email("Enter a valid email address.").trim().toLowerCase().max(254),
    addressLine: text("your business address", 240),
    city: text("your town or city", 80),
    state,
    operatingStates: z.array(state).min(1, "Choose at least one state you operate in.").max(37),
    cacNumber: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (value.category === "logistics_company") {
      if (!value.businessName) {
        context.addIssue({ code: "custom", path: ["businessName"], message: "Enter your registered business name." });
      }
      if (!value.cacNumber || !/^(RC|BN|IT)?\s?\d{4,8}$/.test(value.cacNumber)) {
        context.addIssue({ code: "custom", path: ["cacNumber"], message: "Enter a valid CAC number, for example RC 1234567." });
      }
    }
  });

export const identitySchema = z
  .object({
    idDocumentType: z.enum(["nin", "drivers_licence", "international_passport", "voters_card"], { message: "Choose an ID type." }),
    idDocumentReference: z.string().trim().toUpperCase().min(5, "Enter the ID number.").max(40, "ID number is too long."),
  })
  .superRefine((value, context) => {
    if (value.idDocumentType === "nin" && !/^\d{11}$/.test(value.idDocumentReference)) {
      context.addIssue({ code: "custom", path: ["idDocumentReference"], message: "A NIN has exactly 11 digits." });
    }
    if (value.idDocumentType !== "nin" && !/^[A-Z0-9-]+$/.test(value.idDocumentReference)) {
      context.addIssue({ code: "custom", path: ["idDocumentReference"], message: "Use letters, digits and dashes only." });
    }
  });

export const vendorDocumentTypeSchema = z.enum(["government_id", "cac_certificate", "proof_of_address", "operating_authority"]);

export const payoutAccountSchema = z.object({
  bankCode: z.string().trim().regex(/^[0-9A-Za-z]{2,12}$/, "Choose your bank."),
  accountNumber: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .refine((value) => /^\d{10}$/.test(value), "Enter your 10-digit NUBAN account number."),
});
