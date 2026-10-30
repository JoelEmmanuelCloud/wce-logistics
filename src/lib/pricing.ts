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
  minWeightKg: number;
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
  if (!Number.isInteger(input.weightKg) || input.weightKg < input.minWeightKg) {
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

export type OpenOffer = { ratePerKgKobo: number; minimumChargeKobo: number; remainingKg: number };

export type RouteLane = { origin: string; destination: string; offers: OpenOffer[] };

export type Estimate = { lowestKobo: number; highestKobo: number; trips: number };

export function estimateRange(offers: OpenOffer[], weightKg: number, minWeightKg: number): Estimate | null {
  const totals = offers.flatMap((offer) => {
    if (offer.remainingKg < weightKg) {
      return [];
    }
    const quote = quoteFor({
      type: "shared",
      weightKg,
      minWeightKg,
      ratePerKgKobo: offer.ratePerKgKobo,
      minimumChargeKobo: offer.minimumChargeKobo,
      dedicatedPriceKobo: null,
    });
    return quote ? [quote.totalKobo] : [];
  });
  if (totals.length === 0) {
    return null;
  }
  return { lowestKobo: Math.min(...totals), highestKobo: Math.max(...totals), trips: totals.length };
}

const compactNaira =new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", notation: "compact", maximumFractionDigits: 1 });

export function formatCompactNaira(kobo: number): string {
  return compactNaira.format(kobo / KOBO_PER_NAIRA);
}
