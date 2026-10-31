import { z } from "zod";
import { isNigerianState } from "@/data/nigeria-states";
import { addDays, isIsoDate, lagosToday } from "@/lib/dates";
import { nairaToKobo } from "@/lib/pricing";

export const MAX_DELIVERY_HORIZON_DAYS = 90;

const wholeNumber = (label: string, min: number, max: number) =>
  z.coerce
    .number({ message: `Enter the ${label}.` })
    .int(`Enter the ${label} as a whole number.`)
    .min(min, `The ${label} must be at least ${min.toLocaleString("en-NG")}.`)
    .max(max, `The ${label} must be ${max.toLocaleString("en-NG")} or less.`);

const naira = (label: string, { min, required }: { min: number; required: boolean }) =>
  z
    .string()
    .trim()
    .transform((value, context): number => {
      const cleaned = value.replace(/[₦,\s]/g, "");
      if (!cleaned) {
        if (required) {
          context.addIssue({ code: "custom", message: `Enter the ${label}.` });
          return z.NEVER;
        }
        return 0;
      }
      const amount = Number(cleaned);
      if (!Number.isFinite(amount) || amount < min || amount > 10_000_000 || !/^\d+(\.\d{1,2})?$/.test(cleaned)) {
        context.addIssue({ code: "custom", message: `Enter a valid ${label} in naira.` });
        return z.NEVER;
      }
      return nairaToKobo(amount);
    });

export const productSchema = (categories: readonly string[]) =>
  z.object({
    title: z.string().trim().min(3, "Enter the product name.").max(120, "Keep the name under 120 characters."),
    description: z.string().trim().min(20, "Describe the product in at least 20 characters.").max(2000, "Keep the description under 2,000 characters."),
    category: z.string().refine((value) => categories.includes(value), "Choose a category."),
    unitLabel: z.string().trim().min(2, "Enter how it is sold, for example 50 kg bag.").max(40, "Keep this under 40 characters."),
    unitWeightKg: wholeNumber("weight of one unit in kg", 1, 50_000),
    priceKobo: naira("price per unit", { min: 1, required: true }),
    stockUnits: wholeNumber("units in stock", 0, 1_000_000),
    minOrderUnits: wholeNumber("minimum order", 1, 100_000),
    status: z.enum(["active", "paused"], { message: "Choose whether this product is on sale." }),
  });

export type ProductInput = z.infer<ReturnType<typeof productSchema>>;

export const deliveryRateSchema = z.object({
  destinationState: z.string().refine(isNigerianState, "Choose a state."),
  ratePerTonneKobo: naira("rate per tonne", { min: 1, required: true }),
  minimumChargeKobo: naira("minimum delivery charge", { min: 0, required: false }),
});

export type DeliveryRateFormInput = z.infer<typeof deliveryRateSchema>;

export const checkoutSchema = z.object({
  destinationState: z.string().refine(isNigerianState, "Choose a delivery state."),
  destinationCity: z.string().trim().min(2, "Enter the delivery town or city.").max(80, "This is too long."),
  destinationAddress: z.string().trim().min(5, "Enter the delivery address.").max(240, "This is too long."),
  deliveryNotes: z
    .string()
    .trim()
    .max(500, "Keep notes under 500 characters.")
    .optional()
    .transform((value) => value || null),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const acceptOrderSchema = z.object({
  truckId: z.uuid({ message: "Choose a truck." }),
  departureDate: z.string().refine((value) => {
    if (!isIsoDate(value)) {
      return false;
    }
    const today = lagosToday();
    return value >= today && value <= addDays(today, MAX_DELIVERY_HORIZON_DAYS);
  }, `Choose a date between today and ${MAX_DELIVERY_HORIZON_DAYS} days from now.`),
  transitHours: wholeNumber("estimated transit time in hours", 1, 240),
});

export type AcceptOrderInput = z.infer<typeof acceptOrderSchema>;
