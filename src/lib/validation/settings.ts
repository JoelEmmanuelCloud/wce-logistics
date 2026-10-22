import { z } from "zod";
import { TRUCK_CATEGORIES } from "@/lib/labels";

const whole = (label: string, min: number, max: number) =>
  z.coerce
    .number({ message: `Enter the ${label}.` })
    .int(`Enter the ${label} as a whole number.`)
    .min(min, `The ${label} must be at least ${min.toLocaleString("en-NG")}.`)
    .max(max, `The ${label} must be ${max.toLocaleString("en-NG")} or less.`);

const truckCategoryValues = TRUCK_CATEGORIES.map((option) => option.value) as string[];

export const settingsSchema = z
  .object({
    commissionPercent: z
      .string()
      .trim()
      .refine((value) => /^\d{1,2}(\.\d{1,2})?$/.test(value), "Enter a percentage such as 10 or 7.5.")
      .transform((value) => Math.round(Number(value) * 100))
      .refine((bps) => bps >= 0 && bps <= 5000, "Commission must be between 0% and 50%."),
    minShipmentKg: whole("minimum shipment weight", 1, 10_000),
    responseWindowHours: whole("vendor response window", 1, 168),
    autoCompleteHours: whole("automatic completion window", 24, 720),
    disputeWindowDays: whole("dispute window", 1, 90),
    enabledTruckCategories: z
      .array(z.string().refine((value) => truckCategoryValues.includes(value), "Choose truck categories from the list."))
      .min(1, "Accept at least one truck category."),
  })
  .transform(({ commissionPercent, enabledTruckCategories, ...rest }) => ({
    ...rest,
    commissionBps: commissionPercent,
    disabledTruckCategories: truckCategoryValues.filter((value) => !enabledTruckCategories.includes(value)),
  }));

export const cargoLabelSchema = z.string().trim().min(3, "Enter a category name of at least 3 characters.").max(60, "Keep the name under 60 characters.");
