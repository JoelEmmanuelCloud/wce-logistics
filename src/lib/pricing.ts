export const KOBO_PER_NAIRA = 100;

export type LineItem = { label: string; amountKobo: number };

export type Quote = {
  chargeableWeightKg: number;
  ratePerTonneKobo: number;
  lineItems: LineItem[];
  totalKobo: number;
};

export type QuoteInput = {
  type: "shared" | "dedicated";
  weightKg: number;
  minWeightKg: number;
  ratePerTonneKobo: number;
  minimumChargeKobo: number;
  dedicatedPriceKobo: number | null;
  loadingChargeKobo: number;
  offloadingChargeKobo: number;
  tollChargeKobo: number;
};

export const KG_PER_TONNE = 1000;

export function transportKobo(weightKg: number, ratePerTonneKobo: number): number {
  return Math.round((weightKg * ratePerTonneKobo) / KG_PER_TONNE);
}

function extraCharges(input: QuoteInput): LineItem[] {
  return [
    { label: "Loading", amountKobo: input.loadingChargeKobo },
    { label: "Offloading", amountKobo: input.offloadingChargeKobo },
    { label: "Tolls", amountKobo: input.tollChargeKobo },
  ].filter((item) => item.amountKobo > 0);
}

function total(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.amountKobo, 0);
}

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
    const lineItems = [{ label: "Dedicated truck for this trip", amountKobo: input.dedicatedPriceKobo }, ...extraCharges(input)];
    return {
      chargeableWeightKg: input.weightKg,
      ratePerTonneKobo: input.ratePerTonneKobo,
      lineItems,
      totalKobo: total(lineItems),
    };
  }

  const baseKobo = transportKobo(input.weightKg, input.ratePerTonneKobo);
  const lineItems: LineItem[] = [
    { label: `Transport: ${grouped.format(input.weightKg)} kg at ${formatNaira(input.ratePerTonneKobo)} per tonne`, amountKobo: baseKobo },
  ];
  if (input.minimumChargeKobo > baseKobo) {
    lineItems.push({ label: "Minimum charge top-up", amountKobo: input.minimumChargeKobo - baseKobo });
  }
  lineItems.push(...extraCharges(input));
  return {
    chargeableWeightKg: input.weightKg,
    ratePerTonneKobo: input.ratePerTonneKobo,
    lineItems,
    totalKobo: total(lineItems),
  };
}

export type OpenOffer = {
  ratePerTonneKobo: number;
  minimumChargeKobo: number;
  loadingChargeKobo: number;
  offloadingChargeKobo: number;
  tollChargeKobo: number;
  remainingKg: number;
};

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
      ratePerTonneKobo: offer.ratePerTonneKobo,
      minimumChargeKobo: offer.minimumChargeKobo,
      dedicatedPriceKobo: null,
      loadingChargeKobo: offer.loadingChargeKobo,
      offloadingChargeKobo: offer.offloadingChargeKobo,
      tollChargeKobo: offer.tollChargeKobo,
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
