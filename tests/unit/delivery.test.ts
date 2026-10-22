import { describe, expect, it } from "vitest";
import { addDays, lagosToday } from "@/lib/dates";
import { availableUpdates, canRecord, licenceCoversTruck, nextStatus, withinDisputeWindow } from "@/lib/delivery";
import { deliveryUpdateSchema, disputeSchema, disputeStatusSchema, driverSchema, reviewSchema } from "@/lib/validation/delivery";

describe("delivery steps", () => {
  it("moves a booking through pickup, transit and delivery in order", () => {
    expect(availableUpdates("pickup_scheduled", [])).toEqual(["arrived_at_pickup", "goods_collected", "incident_reported"]);
    expect(nextStatus("goods_collected", "pickup_scheduled")).toBe("goods_collected");
    expect(availableUpdates("goods_collected", ["arrived_at_pickup", "goods_collected"])).toEqual(["departed", "incident_reported"]);
    expect(nextStatus("departed", "goods_collected")).toBe("in_transit");
    expect(availableUpdates("in_transit", ["goods_collected", "departed"])).toEqual([
      "arrived_at_destination",
      "delivery_attempted",
      "delivered",
      "incident_reported",
    ]);
    expect(nextStatus("delivered", "delivery_attempted")).toBe("delivered");
  });

  it("keeps the status for milestones and incidents", () => {
    expect(nextStatus("arrived_at_pickup", "pickup_scheduled")).toBe("pickup_scheduled");
    expect(nextStatus("incident_reported", "in_transit")).toBe("in_transit");
  });

  it("refuses steps out of order or repeated", () => {
    expect(canRecord("delivered", "pickup_scheduled", [])).toBe(false);
    expect(canRecord("goods_collected", "confirmed", [])).toBe(false);
    expect(canRecord("arrived_at_pickup", "pickup_scheduled", ["arrived_at_pickup"])).toBe(false);
    expect(canRecord("delivery_attempted", "delivery_attempted", ["delivery_attempted"])).toBe(true);
    expect(availableUpdates("delivered", [])).toEqual([]);
    expect(availableUpdates("completed", [])).toEqual([]);
  });
});

describe("licence coverage", () => {
  it("matches FRSC classes to truck categories", () => {
    expect(licenceCoversTruck("C", "light_duty")).toBe(true);
    expect(licenceCoversTruck("C", "heavy_duty")).toBe(false);
    expect(licenceCoversTruck("E", "heavy_duty")).toBe(true);
    expect(licenceCoversTruck("E", "articulated")).toBe(false);
    expect(licenceCoversTruck("G", "articulated")).toBe(true);
    expect(licenceCoversTruck("X", "light_duty")).toBe(false);
  });
});

describe("dispute window", () => {
  const day = 24 * 60 * 60 * 1000;
  it("allows disputes on active bookings and recently closed ones", () => {
    expect(withinDisputeWindow("in_transit", null)).toBe(true);
    expect(withinDisputeWindow("completed", new Date(Date.now() - 3 * day))).toBe(true);
    expect(withinDisputeWindow("completed", new Date(Date.now() - 15 * day))).toBe(false);
    expect(withinDisputeWindow("cancelled", null)).toBe(false);
    expect(withinDisputeWindow("pending_vendor_acceptance", null)).toBe(false);
  });
});

describe("delivery validation", () => {
  const driver = {
    fullName: "Musa Bello",
    email: " Musa.Bello@Example.com ",
    phone: "0803 123 4567",
    licenceNumber: "abc-12345 aa67",
    licenceClass: "E",
    licenceExpiresOn: addDays(lagosToday(), 200),
  };

  it("normalises driver details", () => {
    const parsed = driverSchema.parse(driver);
    expect(parsed.email).toBe("musa.bello@example.com");
    expect(parsed.phone).toBe("+2348031234567");
    expect(parsed.licenceNumber).toBe("ABC12345AA67");
  });

  it("rejects expired licences, bad classes and short numbers", () => {
    expect(driverSchema.safeParse({ ...driver, licenceExpiresOn: addDays(lagosToday(), -1) }).success).toBe(false);
    expect(driverSchema.safeParse({ ...driver, licenceClass: "B" }).success).toBe(false);
    expect(driverSchema.safeParse({ ...driver, licenceNumber: "AB12" }).success).toBe(false);
  });

  it("requires a recipient for deliveries and a description for problems", () => {
    expect(deliveryUpdateSchema.safeParse({ kind: "delivered", recipientName: "" }).success).toBe(false);
    expect(deliveryUpdateSchema.safeParse({ kind: "delivered", recipientName: "Chika Eze" }).success).toBe(true);
    expect(deliveryUpdateSchema.safeParse({ kind: "incident_reported", note: "" }).success).toBe(false);
    expect(deliveryUpdateSchema.safeParse({ kind: "delivery_attempted", note: "Gate locked, no answer" }).success).toBe(true);
    expect(deliveryUpdateSchema.safeParse({ kind: "completed" }).success).toBe(false);
  });

  it("validates reviews, disputes and resolutions", () => {
    expect(reviewSchema.safeParse({ rating: "5", comment: "" }).data).toEqual({ rating: 5, comment: null });
    expect(reviewSchema.safeParse({ rating: "6" }).success).toBe(false);
    expect(disputeSchema.safeParse({ category: "damaged_goods", description: "Too short" }).success).toBe(false);
    expect(disputeStatusSchema.safeParse({ status: "resolved", resolution: "" }).success).toBe(false);
    expect(disputeStatusSchema.safeParse({ status: "under_review", resolution: "" }).success).toBe(true);
  });
});
