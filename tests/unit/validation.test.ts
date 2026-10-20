import { describe, expect, it } from "vitest";
import { normalizeRegistration, truckDocumentSchema, truckSchema } from "@/lib/validation/truck";
import { identitySchema, vendorProfileSchema } from "@/lib/validation/vendor";

const validTruck = {
  registrationNumber: "kja-123ab",
  make: "MAN",
  model: "TGS",
  year: "2019",
  category: "heavy_duty",
  tyreCount: "10",
  maxPayloadKg: "20000",
  bodyType: "enclosed",
  bodyLengthM: "12.5",
  bodyWidthM: "",
  bodyHeightM: "",
  cargoTypes: ["general_goods"],
  baseState: "Lagos",
  baseCity: "Apapa",
};

describe("truck validation", () => {
  it("accepts a valid truck and normalizes values", () => {
    const result = truckSchema.parse(validTruck);
    expect(result.registrationNumber).toBe("KJA-123AB");
    expect(result.year).toBe(2019);
    expect(result.maxPayloadKg).toBe(20000);
    expect(result.bodyLengthM).toBe("12.50");
    expect(result.bodyWidthM).toBeNull();
  });

  it("normalizes registration numbers for duplicate detection", () => {
    expect(normalizeRegistration("kja 123-ab")).toBe("KJA123AB");
    expect(normalizeRegistration("KJA-123AB")).toBe("KJA123AB");
  });

  it.each([
    [{ registrationNumber: "ABCDEF" }, "registrationNumber"],
    [{ maxPayloadKg: "100" }, "maxPayloadKg"],
    [{ tyreCount: "2" }, "tyreCount"],
    [{ year: "1950" }, "year"],
    [{ cargoTypes: [] }, "cargoTypes"],
    [{ baseState: "Atlantis" }, "baseState"],
    [{ bodyLengthM: "-1" }, "bodyLengthM"],
  ])("rejects %o", (override, field) => {
    const result = truckSchema.safeParse({ ...validTruck, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues.some((issue) => issue.path[0] === field)).toBe(true);
  });

  it("requires a future expiry date for expiring documents", () => {
    const truckId = "8a5f0a5e-5c2b-4c4f-9f2a-0e6f7e1d2c3b";
    expect(truckDocumentSchema.safeParse({ truckId, type: "insurance", expiryDate: "" }).success).toBe(false);
    expect(truckDocumentSchema.safeParse({ truckId, type: "insurance", expiryDate: "2001-01-01" }).success).toBe(false);
    expect(truckDocumentSchema.safeParse({ truckId, type: "insurance", expiryDate: "2999-01-01" }).success).toBe(true);
    expect(truckDocumentSchema.safeParse({ truckId, type: "vehicle_registration" }).success).toBe(true);
    expect(truckDocumentSchema.safeParse({ truckId, type: "insurance", issueDate: "2999-02-01", expiryDate: "2999-01-01" }).success).toBe(false);
  });
});

describe("vendor validation", () => {
  const company = {
    category: "logistics_company",
    legalName: "Amaka Nwosu",
    businessName: "Nwosu Freight Ltd",
    email: "OPS@Example.com",
    addressLine: "4 Creek Road",
    city: "Apapa",
    state: "Lagos",
    operatingStates: ["Lagos", "Kano"],
    cacNumber: "rc 1234567",
  };

  it("requires a business name and CAC number for companies", () => {
    expect(vendorProfileSchema.safeParse(company).success).toBe(true);
    const missing = vendorProfileSchema.safeParse({ ...company, businessName: "", cacNumber: "" });
    expect(missing.success).toBe(false);
    expect(missing.error?.issues.map((issue) => issue.path[0]).sort()).toEqual(["businessName", "cacNumber"]);
  });

  it("does not require CAC details for individual owners", () => {
    const result = vendorProfileSchema.parse({ ...company, category: "individual_owner", businessName: "", cacNumber: "" });
    expect(result.businessName).toBeNull();
    expect(result.email).toBe("ops@example.com");
  });

  it("requires at least one operating state", () => {
    expect(vendorProfileSchema.safeParse({ ...company, operatingStates: [] }).success).toBe(false);
  });

  it("validates identity numbers", () => {
    expect(identitySchema.safeParse({ idDocumentType: "nin", idDocumentReference: "12345678901" }).success).toBe(true);
    expect(identitySchema.safeParse({ idDocumentType: "nin", idDocumentReference: "1234" }).success).toBe(false);
    expect(identitySchema.safeParse({ idDocumentType: "international_passport", idDocumentReference: "A12345678" }).success).toBe(true);
    expect(identitySchema.safeParse({ idDocumentType: "drivers_licence", idDocumentReference: "ABC 123!" }).success).toBe(false);
  });
});
