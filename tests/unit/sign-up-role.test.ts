import { describe, expect, it } from "vitest";
import { onboardingPathFor, signUpRoleFrom } from "@/server/auth/dal";

describe("signUpRoleFrom", () => {
  it("accepts the two roles people can sign up as", () => {
    expect(signUpRoleFrom("customer")).toBe("customer");
    expect(signUpRoleFrom("vendor")).toBe("vendor");
  });

  it("ignores anything else", () => {
    expect(signUpRoleFrom("admin")).toBeNull();
    expect(signUpRoleFrom("driver")).toBeNull();
    expect(signUpRoleFrom(["vendor"])).toBeNull();
    expect(signUpRoleFrom(undefined)).toBeNull();
    expect(signUpRoleFrom("")).toBeNull();
  });
});

describe("onboardingPathFor", () => {
  it("carries the chosen role to onboarding", () => {
    expect(onboardingPathFor("vendor")).toBe("/onboarding?as=vendor");
    expect(onboardingPathFor(null)).toBe("/onboarding");
  });

  it("carries the page to return to after onboarding", () => {
    expect(onboardingPathFor("customer", "/checkout")).toBe("/onboarding?as=customer&next=%2Fcheckout");
  });
});
