import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("renders the hero with brand content and no console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    await expect(page).toHaveTitle(/WCE Logistics/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every State");
    await expect(page.getByRole("img", { name: /Map of Nigeria/ })).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("header sign-in link opens the sign-in page", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "Sign in" }).filter({ visible: true }).click();
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome to WCE Logistics");
  });

  test("serves security headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("every section has a labelled heading", async ({ page }) => {
    await page.goto("/");
    for (const id of ["services", "how-it-works", "trust", "pricing", "industries", "vendors", "faq"]) {
      const section = page.locator(`section#${id}`);
      await expect(section).toHaveCount(1);
      await expect(section.getByRole("heading", { level: 2 })).toBeVisible();
    }
  });

  test("every image resolves to a real image", async ({ page }) => {
    test.slow();
    await page.goto("/");
    const sources = await page.evaluate(() => [...new Set(Array.from(document.images).map((image) => image.currentSrc || image.src))]);
    expect(sources.length).toBeGreaterThan(10);
    const results = await Promise.all(
      sources.map(async (source) => {
        const response = await page.request.get(source);
        return { source, ok: response.ok(), type: response.headers()["content-type"] ?? "" };
      }),
    );
    expect(results.filter((result) => !result.ok || !result.type.startsWith("image/"))).toEqual([]);
  });

  test("how it works tabs switch by click and arrow keys", async ({ page }) => {
    await page.goto("/");
    const shippers = page.getByRole("tab", { name: "For shippers" });
    const vendors = page.getByRole("tab", { name: "For vendors" });
    await expect(shippers).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toContainText("Describe your load");

    await vendors.click();
    await expect(vendors).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toContainText("Get verified");

    await vendors.press("ArrowRight");
    await expect(shippers).toHaveAttribute("aria-selected", "true");
    await expect(shippers).toBeFocused();
  });

  test("FAQ items expand", async ({ page }) => {
    await page.goto("/");
    const question = page.getByText("What is the minimum shipment weight?");
    const answer = page.getByText(/Each shipment must weigh at least 50 kg/);
    await expect(answer).toBeHidden();
    await question.click();
    await expect(answer).toBeVisible();
  });

  test("contact links use the configured email", async ({ page }) => {
    await page.goto("/");
    const links = page.locator('a[href^="mailto:"]');
    expect(await links.count()).toBeGreaterThan(2);
    const hrefs = await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href") ?? ""));
    for (const href of hrefs) {
      expect(href).toMatch(/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/);
    }
  });
});

test.describe("desktop navigation", () => {
  test.skip(({ isMobile }) => isMobile, "desktop only");

  test("dropdown opens, closes on Escape and navigates to sections", async ({ page }) => {
    await page.goto("/");
    const services = page.getByRole("button", { name: "Services" });
    await services.click();
    await expect(services).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Escape");
    await expect(services).toHaveAttribute("aria-expanded", "false");

    await page.getByRole("button", { name: "Company" }).click();
    await page.locator("header").getByRole("link", { name: /Pricing/ }).click();
    await expect(page).toHaveURL(/#pricing$/);
    await expect(page.getByRole("heading", { name: /Priced by/ })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Company" })).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("mobile navigation", () => {
  test.skip(({ isMobile }) => !isMobile, "mobile only");

  test("menu toggles and has no horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    const menu = page.getByRole("button", { name: "Menu" });
    await menu.click();
    await expect(page.getByRole("button", { name: "Close" })).toHaveAttribute("aria-expanded", "true");
    await page.locator("header").getByRole("link", { name: /Become a vendor/ }).click();
    await expect(page).toHaveURL(/#vendors$/);
    await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  });
});
