import { describe, expect, it } from "vitest";
import { maskPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone", () => {
  it.each([
    ["08031234567", "+2348031234567"],
    ["0803 123 4567", "+2348031234567"],
    ["+234 803 123 4567", "+2348031234567"],
    ["2348031234567", "+2348031234567"],
    ["0905-123-4567", "+2349051234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "12345", "0803123", "abcdefghijk"])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe("maskPhone", () => {
  it("keeps the country code and last three digits", () => {
    expect(maskPhone("+2348031234567")).toBe("+234•••••••567");
  });
});
