import { describe, expect, it } from "vitest";
import { addDays, lagosToday } from "@/lib/dates";
import { nairaToKobo } from "@/lib/pricing";
import { deliveryFeeKobo, MAX_CART_LINES, orderTotals, parseCart, returnPathFrom, serializeCart, setCartLine } from "@/lib/shop";
import { acceptOrderSchema, checkoutSchema, deliveryRateSchema, productSchema } from "@/lib/validation/shop";

const productA = "11111111-1111-4111-8111-111111111111";
const productB = "22222222-2222-4222-8222-222222222222";

describe("deliveryFeeKobo", () => {
  const rate = { ratePerTonneKobo: nairaToKobo(40_000), minimumChargeKobo: nairaToKobo(15_000) };

  it("charges weight in tonnes times the rate", () => {
    expect(deliveryFeeKobo(2_000, rate)).toBe(nairaToKobo(80_000));
  });

  it("never drops below the seller's minimum charge", () => {
    expect(deliveryFeeKobo(100, rate)).toBe(nairaToKobo(15_000));
  });
});

describe("orderTotals", () => {
  const lines = [
    { unitPriceKobo: nairaToKobo(10_000), unitWeightKg: 50, quantity: 20 },
    { unitPriceKobo: nairaToKobo(2_500), unitWeightKg: 25, quantity: 8 },
  ];

  it("adds goods and delivery", () => {
    expect(orderTotals(lines, { ratePerTonneKobo: nairaToKobo(50_000), minimumChargeKobo: 0 })).toEqual({
      goodsKobo: nairaToKobo(220_000),
      weightKg: 1_200,
      deliveryKobo: nairaToKobo(60_000),
      totalKobo: nairaToKobo(280_000),
    });
  });

  it("leaves delivery out until a state with a rate is chosen", () => {
    const totals = orderTotals(lines, null);
    expect(totals.deliveryKobo).toBe(0);
    expect(totals.totalKobo).toBe(totals.goodsKobo);
  });
});

describe("cart cookie", () => {
  it("reads back what it wrote", () => {
    const lines = [{ productId: productA, quantity: 3 }];
    expect(parseCart(serializeCart(lines))).toEqual(lines);
  });

  it("ignores broken or tampered values", () => {
    expect(parseCart(undefined)).toEqual([]);
    expect(parseCart("not json")).toEqual([]);
    expect(parseCart('{"p":1}')).toEqual([]);
    expect(parseCart(JSON.stringify([{ p: "abc", q: 1 }, { p: productA, q: -2 }, { p: productB, q: 1.5 }]))).toEqual([]);
  });

  it("caps the number of lines", () => {
    const many = Array.from({ length: MAX_CART_LINES + 5 }, (_, index) => ({ p: `${String(index).padStart(8, "0")}-1111-4111-8111-111111111111`, q: 1 }));
    expect(parseCart(JSON.stringify(many))).toHaveLength(MAX_CART_LINES);
  });

  it("adds, changes and removes lines", () => {
    const one = setCartLine([], productA, 2);
    const two = setCartLine(one, productB, 1);
    expect(setCartLine(two, productA, 5).find((line) => line.productId === productA)?.quantity).toBe(5);
    expect(setCartLine(two, productA, 0)).toEqual([{ productId: productB, quantity: 1 }]);
  });
});

describe("returnPathFrom", () => {
  it("only allows known pages, so sign-in cannot redirect elsewhere", () => {
    expect(returnPathFrom("/checkout")).toBe("/checkout");
    expect(returnPathFrom("https://evil.example")).toBeNull();
    expect(returnPathFrom("//evil.example")).toBeNull();
    expect(returnPathFrom(undefined)).toBeNull();
  });
});

describe("shop validation", () => {
  const product = {
    title: "Dangote cement",
    description: "Grade 42.5 cement in sealed bags, ready to load from our Lagos yard.",
    category: "construction_materials",
    unitLabel: "50 kg bag",
    unitWeightKg: "50",
    priceKobo: "₦10,500",
    stockUnits: "400",
    minOrderUnits: "10",
    status: "active",
  };

  it("converts prices to kobo", () => {
    expect(productSchema(["construction_materials"]).parse(product).priceKobo).toBe(1_050_000);
  });

  it.each([
    [{ title: "x" }, "title"],
    [{ category: "weapons" }, "category"],
    [{ unitWeightKg: "0" }, "unitWeightKg"],
    [{ priceKobo: "" }, "priceKobo"],
    [{ priceKobo: "12.345" }, "priceKobo"],
    [{ stockUnits: "-1" }, "stockUnits"],
    [{ minOrderUnits: "0" }, "minOrderUnits"],
  ])("rejects %j", (change, field) => {
    const result = productSchema(["construction_materials"]).safeParse({ ...product, ...change });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual([field]);
  });

  it("treats an empty minimum delivery charge as zero", () => {
    expect(deliveryRateSchema.parse({ destinationState: "Lagos", ratePerTonneKobo: "40,000", minimumChargeKobo: "" })).toEqual({
      destinationState: "Lagos",
      ratePerTonneKobo: 4_000_000,
      minimumChargeKobo: 0,
    });
  });

  it("requires a real state and address at checkout", () => {
    expect(checkoutSchema.safeParse({ destinationState: "Atlantis", destinationCity: "Ikeja", destinationAddress: "12 Allen Avenue" }).success).toBe(false);
    expect(checkoutSchema.parse({ destinationState: "Lagos", destinationCity: "Ikeja", destinationAddress: "12 Allen Avenue", deliveryNotes: " " }).deliveryNotes).toBeNull();
  });

  it("only accepts delivery dates from today onwards", () => {
    const base = { truckId: productA, transitHours: "24" };
    expect(acceptOrderSchema.safeParse({ ...base, departureDate: addDays(lagosToday(), 2) }).success).toBe(true);
    expect(acceptOrderSchema.safeParse({ ...base, departureDate: addDays(lagosToday(), -1) }).success).toBe(false);
  });
});
