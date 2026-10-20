import { expect, readOtp, test, uniquePhone } from "./support/fixtures";

test.describe("phone sign-in", () => {
  test.skip(({ isMobile }) => isMobile, "flow is covered on desktop");

  test("new user verifies a code, completes onboarding and lands on the vendor dashboard", async ({ page }) => {
    test.slow();
    const phone = uniquePhone();
    const local = `0${phone.slice(4)}`;

    await page.goto("/sign-in");
    await page.getByLabel("Mobile number").fill(local);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText(/We sent a 6-digit code/)).toBeVisible();

    const code = await readOtp(phone);
    await page.getByLabel("Verification code").fill(code);
    await page.getByRole("button", { name: "Verify and continue" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.getByRole("button", { name: "Create my account" }).click();
    await expect(page.getByText("Choose how you will use WCE Logistics.")).toBeVisible();

    await page.getByLabel("I own or manage trucks").check();
    await page.getByLabel("Full name").fill("Chinedu Eze");
    await page.getByRole("button", { name: "Create my account" }).click();
    await expect(page).toHaveURL(/\/vendor$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Chinedu");
  });

  test("rejects an invalid phone number", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Mobile number").fill("12345");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText(/Enter a valid mobile number/)).toBeVisible();
  });

  test("rejects a wrong code and locks after repeated failures", async ({ page }) => {
    test.slow();
    const phone = uniquePhone();
    await page.goto("/sign-in");
    await page.getByLabel("Mobile number").fill(phone);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText(/We sent a 6-digit code/)).toBeVisible();
    const code = await readOtp(phone);
    const wrong = code === "000000" ? "111111" : "000000";

    const submitCode = async (value: string) => {
      await page.getByLabel("Verification code").fill(value);
      await Promise.all([
        page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith("/sign-in")),
        page.getByRole("button", { name: "Verify and continue" }).click(),
      ]);
      await expect(page.getByLabel("Verification code")).toHaveValue("");
    };

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await submitCode(wrong);
      await expect(page.getByText("That code is not correct.", { exact: false }).first()).toBeVisible();
    }
    await submitCode(wrong);
    await expect(page.getByText("Too many incorrect attempts. Request a new code.")).toBeVisible();

    await submitCode(code);
    await expect(page.getByText(/Too many incorrect attempts|has expired/).first()).toBeVisible();
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test("limits how often a code can be resent", async ({ page }) => {
    const phone = uniquePhone();
    await page.goto("/sign-in");
    await page.getByLabel("Mobile number").fill(phone);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("button", { name: /Resend code in \d+s/ })).toBeDisabled();
  });
});

test.describe("access control", () => {
  test("signed-out visitors are sent to sign in", async ({ page }) => {
    for (const path of ["/vendor", "/vendor/trucks", "/account", "/admin"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/sign-in$/);
    }
  });

  test("users without a role are sent to onboarding", async ({ page, signInAs }) => {
    await signInAs(null);
    await page.goto("/vendor");
    await expect(page).toHaveURL(/\/onboarding$/);
  });

  test("shippers cannot open vendor or admin areas", async ({ page, signInAs }) => {
    await signInAs("customer", { fullName: "Bola Ade" });
    await page.goto("/vendor");
    await expect(page).toHaveURL(/\/account$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Bola");
  });

  test("vendors cannot open the admin area", async ({ page, signInAs }) => {
    await signInAs("vendor");
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/vendor$/);
  });

  test("signing out ends the session", async ({ page, signInAs, isMobile }) => {
    await signInAs("customer");
    await page.goto("/account");
    if (isMobile) {
      await page.getByRole("button", { name: "Menu" }).click();
    }
    await page.getByRole("button", { name: "Sign out" }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/account");
    await expect(page).toHaveURL(/\/sign-in$/);
  });
});

test.describe("shipper account", () => {
  test.skip(({ isMobile }) => isMobile, "covered on desktop");

  test("updates account details and validates email", async ({ page, signInAs }) => {
    await signInAs("customer", { fullName: "Bola Ade" });
    await page.goto("/account");
    await page.getByLabel("Email address").fill("not-an-email");
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveValue("not-an-email");

    await page.getByLabel("Full name").fill("Bolaji Adeyemi");
    await page.getByLabel("Email address").fill(`bolaji.${Date.now()}@example.com`);
    await page.getByRole("button", { name: "Save details" }).click();
    await expect(page.getByText("Account details saved.")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Bolaji");
  });
});
