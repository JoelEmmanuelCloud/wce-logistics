import { describe, expect, it } from "vitest";
import { addDays, isIsoDate, lagosToday } from "@/lib/dates";
import { routeSchema, shipmentSchema } from "@/lib/validation/marketplace";

const inAWeek = addDays(lagosToday(), 7);
const POLICY = { minWeightKg: 50, cargoTypes: ["general_goods", "machinery"] };

const route = {
  truckId: "8a5f0a5e-5c2b-4c4f-9f2a-0e6f7e1d2c3b",
  originState: "Lagos",
  originCity: "Apapa",
  destinationState: "Kano",
  destinationCity: "Kano",
  departureDate: inAWeek,
  transitHours: "30",
  capacityKg: "12000",
  allowsShared: "on",
  ratePerTonneKobo: "₦25,500",
  minimumChargeKobo: "5,000",
  dedicatedPriceKobo: "",
  loadingChargeKobo: "1,500",
  offloadingChargeKobo: "",
  tollChargeKobo: "",
};

const shipment = {
  originState: "Lagos",
  originCity: "Ikeja",
  originAddress: "12 Allen Avenue",
  destinationState: "FCT",
  destinationCity: "Abuja",
  destinationAddress: "4 Aminu Kano Crescent",
  cargoType: "general_goods",
  description: "40 cartons of tiles",
  weightKg: "800",
  packageCount: "40",
  declaredValueKobo: "",
  pickupDate: inAWeek,
  handlingNotes: "",
  bookingType: "shared",
};

describe("dates", () => {
  it("adds days and validates ISO dates", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-02-28")).toBe(true);
  });

  it("uses the Lagos calendar day", () => {
    expect(lagosToday(Date.parse("2026-10-20T23:30:00Z"))).toBe("2026-10-21");
    expect(lagosToday(Date.parse("2026-10-20T22:59:00Z"))).toBe("2026-10-20");
  });
});

describe("route validation", () => {
  it("parses money into kobo and checkbox values", () => {
    const parsed = routeSchema(50).parse(route);
    expect(parsed.ratePerTonneKobo).toBe(2_550_000);
    expect(parsed.minimumChargeKobo).toBe(500_000);
    expect(parsed.dedicatedPriceKobo).toBeNull();
    expect(parsed.loadingChargeKobo).toBe(150_000);
    expect(parsed.offloadingChargeKobo).toBe(0);
    expect(parsed.allowsShared).toBe(true);
    expect(parsed.capacityKg).toBe(12_000);
  });

  it("requires a whole-truck price when shared loads are not allowed", () => {
    const result = routeSchema(50).safeParse({ ...route, allowsShared: undefined });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["dedicatedPriceKobo"]);
  });

  it.each([
    [{ departureDate: addDays(lagosToday(), -1) }, "departureDate"],
    [{ departureDate: addDays(lagosToday(), 120) }, "departureDate"],
    [{ ratePerTonneKobo: "" }, "ratePerTonneKobo"],
    [{ ratePerTonneKobo: "12.345" }, "ratePerTonneKobo"],
    [{ tollChargeKobo: "-5" }, "tollChargeKobo"],
    [{ capacityKg: "20" }, "capacityKg"],
    [{ destinationState: "Lagos", destinationCity: "apapa" }, "destinationCity"],
  ])("rejects %o", (override, field) => {
    const result = routeSchema(50).safeParse({ ...route, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === field)).toBe(true);
  });
});

describe("shipment validation", () => {
  it("accepts a valid shipment", () => {
    const parsed = shipmentSchema(POLICY).parse(shipment);
    expect(parsed.weightKg).toBe(800);
    expect(parsed.declaredValueKobo).toBeNull();
    expect(parsed.handlingNotes).toBeNull();
  });

  it("enforces the 50 kg minimum", () => {
    const result = shipmentSchema(POLICY).safeParse({ ...shipment, weightKg: "49" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("at least 50");
  });

  it("rejects unknown cargo types", () => {
    expect(shipmentSchema(POLICY).safeParse({ ...shipment, cargoType: "explosives" }).success).toBe(false);
  });
});

describe("configurable shipment policy", () => {
  it("applies the configured minimum weight and cargo categories", () => {
    const shipment = {
      originState: "Lagos",
      originCity: "Ikeja",
      originAddress: "12 Allen Avenue",
      destinationState: "Kano",
      destinationCity: "Kano",
      destinationAddress: "3 Bompai Road",
      cargoType: "furniture",
      description: "Office chairs and desks",
      weightKg: "30",
      packageCount: "10",
      declaredValueKobo: "",
      pickupDate: addDays(lagosToday(), 3),
      handlingNotes: "",
      bookingType: "shared",
    };
    expect(shipmentSchema({ minWeightKg: 50, cargoTypes: ["furniture"] }).safeParse(shipment).success).toBe(false);
    expect(shipmentSchema({ minWeightKg: 25, cargoTypes: ["furniture"] }).safeParse(shipment).success).toBe(true);
    expect(shipmentSchema({ minWeightKg: 25, cargoTypes: ["general_goods"] }).safeParse(shipment).success).toBe(false);
  });

  it("uses the minimum weight as the smallest trip capacity", () => {
    expect(routeSchema(200).safeParse({ ...route, capacityKg: "150" }).success).toBe(false);
  });
});
