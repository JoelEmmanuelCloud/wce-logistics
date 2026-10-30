import { describe, expect, it } from "vitest";
import { estimateRange, formatNaira, nairaToKobo, quoteFor, transportKobo } from "@/lib/pricing";

const noExtras = { loadingChargeKobo: 0, offloadingChargeKobo: 0, tollChargeKobo: 0 };
const shared = { type: "shared" as const, minWeightKg: 50, ratePerTonneKobo: nairaToKobo(20_000), minimumChargeKobo: 0, dedicatedPriceKobo: null, ...noExtras };

describe("quoteFor", () => {
  it("prices shared loads by weight in tonnes times the rate per tonne", () => {
    const quote = quoteFor({ ...shared, weightKg: 500 });
    expect(quote?.totalKobo).toBe(nairaToKobo(10_000));
    expect(quote?.chargeableWeightKg).toBe(500);
    expect(quote?.lineItems).toEqual([{ label: "Transport: 500 kg at ₦20,000 per tonne", amountKobo: 1_000_000 }]);
  });

  it("adds an itemised top-up when the minimum charge applies", () => {
    const quote = quoteFor({ ...shared, weightKg: 60, minimumChargeKobo: nairaToKobo(5_000) });
    expect(quote?.totalKobo).toBe(nairaToKobo(5_000));
    expect(quote?.lineItems.map((item) => item.label)).toEqual(["Transport: 60 kg at ₦20,000 per tonne", "Minimum charge top-up"]);
  });

  it("lists loading, offloading and tolls as separate lines after transport", () => {
    const quote = quoteFor({
      ...shared,
      weightKg: 500,
      ratePerTonneKobo: nairaToKobo(80_000),
      minimumChargeKobo: nairaToKobo(5_000),
      loadingChargeKobo: nairaToKobo(1_000),
      offloadingChargeKobo: nairaToKobo(1_000),
      tollChargeKobo: 0,
    });
    expect(quote?.lineItems).toEqual([
      { label: "Transport: 500 kg at ₦80,000 per tonne", amountKobo: nairaToKobo(40_000) },
      { label: "Loading", amountKobo: nairaToKobo(1_000) },
      { label: "Offloading", amountKobo: nairaToKobo(1_000) },
    ]);
    expect(quote?.totalKobo).toBe(nairaToKobo(42_000));
  });

  it("applies the minimum charge to transport before adding extra charges", () => {
    const quote = quoteFor({ ...shared, weightKg: 60, minimumChargeKobo: nairaToKobo(5_000), tollChargeKobo: nairaToKobo(2_000) });
    expect(quote?.totalKobo).toBe(nairaToKobo(7_000));
  });

  it("does not quote shipments below 50 kg or with fractional weights", () => {
    expect(quoteFor({ ...shared, weightKg: 49 })).toBeNull();
    expect(quoteFor({ ...shared, weightKg: 50.5 })).toBeNull();
    expect(quoteFor({ ...shared, weightKg: 50 })).not.toBeNull();
  });

  it("uses the fixed price for dedicated trucks and still adds extra charges", () => {
    const quote = quoteFor({ ...shared, type: "dedicated", weightKg: 8_000, dedicatedPriceKobo: nairaToKobo(450_000), loadingChargeKobo: nairaToKobo(5_000) });
    expect(quote?.lineItems).toEqual([
      { label: "Dedicated truck for this trip", amountKobo: nairaToKobo(450_000) },
      { label: "Loading", amountKobo: nairaToKobo(5_000) },
    ]);
    expect(quote?.totalKobo).toBe(nairaToKobo(455_000));
    expect(quoteFor({ ...shared, type: "dedicated", weightKg: 8_000 })).toBeNull();
  });

  it("keeps money exact in kobo", () => {
    const quote = quoteFor({ ...shared, weightKg: 333, ratePerTonneKobo: 1_999_000 });
    expect(quote?.totalKobo).toBe(665_667);
  });
});

describe("transportKobo", () => {
  it("rounds part-kobo results to the nearest kobo", () => {
    expect(transportKobo(333, 1_999_999)).toBe(666_000);
    expect(transportKobo(1, 1_500)).toBe(2);
  });
});

describe("formatNaira", () => {
  it("formats whole and fractional amounts", () => {
    expect(formatNaira(1_200_000)).toBe("₦12,000");
    expect(formatNaira(665_667)).toBe("₦6,656.67");
  });
});

describe("estimateRange", () => {
  const offer = (ratePerTonneNaira: number, remainingKg: number, minimumNaira = 0, tollNaira = 0) => ({
    ratePerTonneKobo: nairaToKobo(ratePerTonneNaira),
    minimumChargeKobo: nairaToKobo(minimumNaira),
    loadingChargeKobo: 0,
    offloadingChargeKobo: 0,
    tollChargeKobo: nairaToKobo(tollNaira),
    remainingKg,
  });

  it("returns the lowest and highest totals across open trips", () => {
    expect(estimateRange([offer(20_000, 5_000), offer(35_000, 5_000), offer(25_000, 5_000)], 500, 50)).toEqual({
      lowestKobo: nairaToKobo(10_000),
      highestKobo: nairaToKobo(17_500),
      trips: 3,
    });
  });

  it("includes each trip's extra charges", () => {
    expect(estimateRange([offer(20_000, 5_000, 0, 1_500)], 500, 50)?.lowestKobo).toBe(nairaToKobo(11_500));
  });

  it("skips trips without room for the load", () => {
    expect(estimateRange([offer(20_000, 400), offer(30_000, 2_000)], 500, 50)).toEqual({
      lowestKobo: nairaToKobo(15_000),
      highestKobo: nairaToKobo(15_000),
      trips: 1,
    });
  });

  it("applies each trip's minimum charge", () => {
    expect(estimateRange([offer(20_000, 5_000, 4_000)], 100, 50)?.lowestKobo).toBe(nairaToKobo(4_000));
  });

  it("returns null when no trip can take the load or the weight is below the minimum", () => {
    expect(estimateRange([offer(20_000, 100)], 500, 50)).toBeNull();
    expect(estimateRange([offer(20_000, 5_000)], 40, 50)).toBeNull();
    expect(estimateRange([], 500, 50)).toBeNull();
  });
});
