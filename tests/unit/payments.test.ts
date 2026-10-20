import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { splitCommission } from "@/server/payments";
import { validWebhookSignature } from "@/server/paystack";

describe("splitCommission", () => {
  it("splits the total between platform and vendor in kobo", () => {
    expect(splitCommission(1_200_000, 1000)).toEqual({ platformFeeKobo: 120_000, vendorPayableKobo: 1_080_000 });
    expect(splitCommission(665_667, 1000)).toEqual({ platformFeeKobo: 66_567, vendorPayableKobo: 599_100 });
    expect(splitCommission(500_000, 0)).toEqual({ platformFeeKobo: 0, vendorPayableKobo: 500_000 });
  });

  it("uses the configured commission rate by default", () => {
    expect(splitCommission(1_000_000)).toEqual({ platformFeeKobo: 100_000, vendorPayableKobo: 900_000 });
  });

  it("never loses or invents a kobo", () => {
    for (const total of [1, 99, 12_345, 987_654_321]) {
      const split = splitCommission(total, 1250);
      expect(split.platformFeeKobo + split.vendorPayableKobo).toBe(total);
    }
  });
});

describe("validWebhookSignature", () => {
  const body = JSON.stringify({ event: "charge.success", data: { reference: "WCE-ABCDEFGH-ABCDEF" } });
  const sign = (payload: string, key = process.env.PAYSTACK_SECRET_KEY ?? "") => createHmac("sha512", key).update(payload).digest("hex");

  it("accepts a correctly signed body", () => {
    expect(validWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects tampered bodies, wrong keys and malformed signatures", () => {
    expect(validWebhookSignature(`${body} `, sign(body))).toBe(false);
    expect(validWebhookSignature(body, sign(body, "sk_test_other"))).toBe(false);
    expect(validWebhookSignature(body, "abc")).toBe(false);
    expect(validWebhookSignature(body, null)).toBe(false);
  });
});
