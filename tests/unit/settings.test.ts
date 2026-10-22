import { describe, expect, it } from "vitest";
import { cargoLabelSchema, settingsSchema } from "@/lib/validation/settings";
import { cargoSlug } from "@/server/settings";

const valid = {
  commissionPercent: "7.5",
  minShipmentKg: "40",
  responseWindowHours: "12",
  autoCompleteHours: "48",
  disputeWindowDays: "10",
  enabledTruckCategories: ["heavy_duty", "flatbed"],
};

describe("settingsSchema", () => {
  it("converts the commission to basis points and lists disabled truck categories", () => {
    const parsed = settingsSchema.parse(valid);
    expect(parsed.commissionBps).toBe(750);
    expect(parsed.minShipmentKg).toBe(40);
    expect(parsed.disabledTruckCategories).toContain("light_duty");
    expect(parsed.disabledTruckCategories).not.toContain("flatbed");
  });

  it.each([
    [{ commissionPercent: "51" }, "commissionPercent"],
    [{ commissionPercent: "10.555" }, "commissionPercent"],
    [{ commissionPercent: "ten" }, "commissionPercent"],
    [{ minShipmentKg: "0" }, "minShipmentKg"],
    [{ autoCompleteHours: "12" }, "autoCompleteHours"],
    [{ disputeWindowDays: "120" }, "disputeWindowDays"],
    [{ enabledTruckCategories: [] }, "enabledTruckCategories"],
    [{ enabledTruckCategories: ["spaceship"] }, "enabledTruckCategories.0"],
  ])("rejects %o", (override, path) => {
    const result = settingsSchema.safeParse({ ...valid, ...override });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path.join("."))).toContain(path);
  });
});

describe("cargo categories", () => {
  it("builds stable identifiers from names", () => {
    expect(cargoSlug("Pharmaceuticals")).toBe("pharmaceuticals");
    expect(cargoSlug("  Cement & Building Blocks ")).toBe("cement_building_blocks");
    expect(cargoSlug("!!!")).toBe("");
  });

  it("validates category names", () => {
    expect(cargoLabelSchema.safeParse("ab").success).toBe(false);
    expect(cargoLabelSchema.safeParse("Livestock feed").success).toBe(true);
  });
});
