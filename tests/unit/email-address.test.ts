import { describe, expect, it } from "vitest";
import { maskEmail, normalizeEmail } from "@/lib/email-address";

describe("normalizeEmail", () => {
  it("lowercases and trims valid addresses", () => {
    expect(normalizeEmail("  Ada.Obi@Company.NG ")).toBe("ada.obi@company.ng");
  });

  it.each(["", "ada", "ada@", "@company.ng", "ada@company", "a b@company.ng"])("rejects %s", (input) => {
    expect(normalizeEmail(input)).toBeNull();
  });
});

describe("maskEmail", () => {
  it("keeps the start of the name and the domain", () => {
    expect(maskEmail("adaeze@company.ng")).toBe("ad••••@company.ng");
    expect(maskEmail("jo@company.ng")).toBe("j•••@company.ng");
  });
});
