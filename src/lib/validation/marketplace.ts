import { z } from "zod";
import { isNigerianState } from "@/data/nigeria-states";
import { addDays, isIsoDate, lagosToday } from "@/lib/dates";
import { nairaToKobo } from "@/lib/pricing";

export const MAX_BOOKING_HORIZON_DAYS = 90;

const state = (message: string) => z.string().refine(isNigerianState, message);
const place = (message: string) => z.string().trim().min(2, message).max(80, "This is too long.");

const futureDate = (label: string) =>
  z.string().refine((value) => {
    if (!isIsoDate(value)) {
      return false;
    }
    const today = lagosToday();
    return value >= today && value <= addDays(today, MAX_BOOKING_HORIZON_DAYS);
  }, `Choose a ${label} between today and ${MAX_BOOKING_HORIZON_DAYS} days from now.`);

function parseNaira(value: string, label: string, min: number, context: z.RefinementCtx): number | null | typeof z.NEVER {
  const cleaned = value.replace(/[₦,\s]/g, "");
  if (!cleaned) {
    return null;
  }
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount < min || amount > 100_000_000 || !/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    context.addIssue({ code: "custom", message: `Enter a valid ${label} in naira.` });
    return z.NEVER;
  }
  return nairaToKobo(amount);
}

const requiredMoney = (label: string, min = 0) =>
  z
    .string()
    .trim()
    .transform((value, context): number => {
      const kobo = parseNaira(value, label, min, context);
      if (kobo === null) {
        context.addIssue({ code: "custom", message: `Enter the ${label}.` });
        return z.NEVER;
      }
      return kobo;
    });

const optionalMoney = (label: string, min = 0) =>
  z
    .string()
    .trim()
    .transform((value, context): number | null => parseNaira(value, label, min, context));

const wholeNumber = (label: string, min: number, max: number) =>
  z.coerce
    .number({ message: `Enter the ${label}.` })
    .int(`Enter the ${label} as a whole number.`)
    .min(min, `The ${label} must be at least ${min.toLocaleString("en-NG")}.`)
    .max(max, `The ${label} must be ${max.toLocaleString("en-NG")} or less.`);

export const routeSchema = (minWeightKg: number) =>
    z
    .object({
      truckId: z.uuid({ message: "Choose a truck." }),
      originState: state("Choose the origin state."),
      originCity: place("Enter the town or city of departure."),
      destinationState: state("Choose the destination state."),
      destinationCity: place("Enter the destination town or city."),
      departureDate: futureDate("departure date"),
      transitHours: wholeNumber("estimated transit time in hours", 1, 240),
      capacityKg: wholeNumber("capacity offered", minWeightKg, 100_000),
      allowsShared: z.enum(["on"]).optional().transform((value) => value === "on"),
      ratePerTonneKobo: requiredMoney("rate per tonne", 1),
      minimumChargeKobo: optionalMoney("minimum charge"),
      dedicatedPriceKobo: optionalMoney("price for the whole truck", 1),
      loadingChargeKobo: optionalMoney("loading charge"),
      offloadingChargeKobo: optionalMoney("offloading charge"),
      tollChargeKobo: optionalMoney("toll charge"),
    })
    .superRefine((value, context) => {
      if (value.originState === value.destinationState && value.originCity.toLowerCase() === value.destinationCity.toLowerCase()) {
        context.addIssue({ code: "custom", path: ["destinationCity"], message: "The destination must be different from the origin." });
      }
      if (!value.allowsShared && !value.dedicatedPriceKobo) {
        context.addIssue({ code: "custom", path: ["dedicatedPriceKobo"], message: "Set a whole-truck price, or allow shared loads." });
      }
    })
    .transform((value) => ({
      ...value,
      minimumChargeKobo: value.minimumChargeKobo ?? 0,
      loadingChargeKobo: value.loadingChargeKobo ?? 0,
      offloadingChargeKobo: value.offloadingChargeKobo ?? 0,
      tollChargeKobo: value.tollChargeKobo ?? 0,
    }));

export type RouteInput = z.infer<ReturnType<typeof routeSchema>>;

export type ShipmentPolicy = { minWeightKg: number; cargoTypes: readonly string[] };

  export const shipmentSchema = (policy: ShipmentPolicy) =>
    z
    .object({
      originState: state("Choose the pickup state."),
      originCity: place("Enter the pickup town or city."),
      originAddress: z.string().trim().min(5, "Enter the pickup address.").max(240),
      destinationState: state("Choose the delivery state."),
      destinationCity: place("Enter the delivery town or city."),
      destinationAddress: z.string().trim().min(5, "Enter the delivery address.").max(240),
      cargoType: z.string().refine((value) => policy.cargoTypes.includes(value), "Choose the type of cargo."),
      description: z.string().trim().min(5, "Describe the goods, for example 40 bags of cement.").max(500),
      weightKg: wholeNumber("total weight in kg", policy.minWeightKg, 100_000),
      packageCount: wholeNumber("number of packages", 1, 100_000),
      declaredValueKobo: optionalMoney("declared value"),
      pickupDate: futureDate("pickup date"),
      handlingNotes: z
        .string()
        .trim()
        .max(500)
        .optional()
        .transform((value) => value || null),
      bookingType: z.enum(["shared", "dedicated"], { message: "Choose shared or dedicated." }),
    })
    .superRefine((value, context) => {
      if (value.originState === value.destinationState && value.originCity.toLowerCase() === value.destinationCity.toLowerCase()) {
        context.addIssue({ code: "custom", path: ["destinationCity"], message: "The delivery location must be different from the pickup location." });
      }
    });

export type ShipmentInput = z.infer<ReturnType<typeof shipmentSchema>>;
