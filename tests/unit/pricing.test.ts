import { describe, expect, it } from "vitest";
import { formatNaira, nairaToKobo, quoteFor } from "@/lib/pricing";

const shared = { type: "shared" as const, ratePerKgKobo: nairaToKobo(20), minimumChargeKobo: 0, dedicatedPriceKobo: null };

describe("quoteFor", () => {
  it("prices shared loads by chargeable weight times rate", () => {
    const quote = quoteFor({ ...shared, weightKg: 500 });
    expect(quote?.totalKobo).toBe(nairaToKobo(10_000));
    expect(quote?.chargeableWeightKg).toBe(500);
    expect(quote?.lineItems).toEqual([{ label: "Transport: 500 kg at ₦20/kg", amountKobo: 1_000_000 }]);
  });

  it("adds an itemised top-up when the minimum charge applies", () => {
    const quote = quoteFor({ ...shared, weightKg: 60, minimumChargeKobo: nairaToKobo(5_000) });
    expect(quote?.totalKobo).toBe(nairaToKobo(5_000));
    expect(quote?.lineItems.map((item) => item.label)).toEqual(["Transport: 60 kg at ₦20/kg", "Minimum charge top-up"]);
  });

  it("does not quote shipments below 50 kg or with fractional weights", () => {
    expect(quoteFor({ ...shared, weightKg: 49 })).toBeNull();
    expect(quoteFor({ ...shared, weightKg: 50.5 })).toBeNull();
    expect(quoteFor({ ...shared, weightKg: 50 })).not.toBeNull();
  });

  it("uses the fixed price for dedicated trucks", () => {
    const quote = quoteFor({ ...shared, type: "dedicated", weightKg: 8_000, dedicatedPriceKobo: nairaToKobo(450_000) });
    expect(quote?.totalKobo).toBe(nairaToKobo(450_000));
    expect(quoteFor({ ...shared, type: "dedicated", weightKg: 8_000 })).toBeNull();
  });

  it("keeps money exact in kobo", () => {
    const quote = quoteFor({ ...shared, weightKg: 333, ratePerKgKobo: 1_999 });
    expect(quote?.totalKobo).toBe(665_667);
  });
});

describe("formatNaira", () => {
  it("formats whole and fractional amounts", () => {
    expect(formatNaira(1_200_000)).toBe("₦12,000");
    expect(formatNaira(665_667)).toBe("₦6,656.67");
  });
});
