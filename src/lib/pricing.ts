export const MIN_SHIPMENT_KG = 50;
export const KOBO_PER_NAIRA = 100;

export type LineItem = { label: string; amountKobo: number };

export type Quote = {
  chargeableWeightKg: number;
  ratePerKgKobo: number;
  lineItems: LineItem[];
  totalKobo: number;
};

export type QuoteInput = {
  type: "shared" | "dedicated";
  weightKg: number;
  ratePerKgKobo: number;
  minimumChargeKobo: number;
  dedicatedPriceKobo: number | null;
};

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 2 });
const grouped = new Intl.NumberFormat("en-NG");

export function formatNaira(kobo: number): string {
  return naira.format(kobo / KOBO_PER_NAIRA);
}

export function nairaToKobo(value: number): number {
  return Math.round(value * KOBO_PER_NAIRA);
}

export function quoteFor(input: QuoteInput): Quote | null {
  if (!Number.isInteger(input.weightKg) || input.weightKg < MIN_SHIPMENT_KG) {
    return null;
  }

  if (input.type === "dedicated") {
    if (!input.dedicatedPriceKobo || input.dedicatedPriceKobo <= 0) {
      return null;
    }
    return {
      chargeableWeightKg: input.weightKg,
      ratePerKgKobo: input.ratePerKgKobo,
      lineItems: [{ label: "Dedicated truck for this trip", amountKobo: input.dedicatedPriceKobo }],
      totalKobo: input.dedicatedPriceKobo,
    };
  }

  const baseKobo = input.weightKg * input.ratePerKgKobo;
  const lineItems: LineItem[] = [
    { label: `Transport: ${grouped.format(input.weightKg)} kg at ${formatNaira(input.ratePerKgKobo)}/kg`, amountKobo: baseKobo },
  ];
  if (input.minimumChargeKobo > baseKobo) {
    lineItems.push({ label: "Minimum charge top-up", amountKobo: input.minimumChargeKobo - baseKobo });
  }
  return {
    chargeableWeightKg: input.weightKg,
    ratePerKgKobo: input.ratePerKgKobo,
    lineItems,
    totalKobo: lineItems.reduce((sum, item) => sum + item.amountKobo, 0),
  };
}
