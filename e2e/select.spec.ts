import { expect, test } from "./support/fixtures";
import { verifiedVendorWithTruck } from "./support/marketplace";

test.describe("shared dropdown", () => {
  test("search, keyboard and selection work on a long list", async ({ page, isMobile }) => {
    await page.goto("/shop");
    const trigger = page.getByRole("combobox", { name: "Deliver to" });
    await expect(trigger).toHaveText(/Choose your state/);

    await trigger.click();
    await expect(page.getByRole("listbox")).toBeVisible();
    const search = page.getByRole("searchbox", { name: "Search options" });
    await expect(search).toBeFocused();

    await search.fill("kan");
    await expect(page.getByRole("option")).toHaveCount(1);
    await search.press("ArrowDown");
    await search.press("Enter");
    await expect(page.getByRole("listbox")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Deliver to" })).toHaveText(/Kano/);
    await expect(page.getByText("to see delivered prices")).toHaveCount(0);

    await page.reload();
    const reopened = page.getByRole("combobox", { name: "Deliver to" });
    await expect(reopened).toHaveText(/Kano/);
    await reopened.click();
    await expect(page.getByRole("option", { name: "Kano" })).toHaveAttribute("aria-selected", "true");

    await page.getByRole("searchbox", { name: "Search options" }).fill("nowhere");
    await expect(page.getByText("No matches")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toHaveCount(0);

    if (isMobile) {
      await reopened.click();
      await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
      await page.getByRole("button", { name: "Close" }).click();
      await expect(page.getByRole("listbox")).toHaveCount(0);
    } else {
      await reopened.click();
      await page.getByRole("heading", { level: 1 }).click();
      await expect(page.getByRole("listbox")).toHaveCount(0);
    }
  });

  test("short lists skip the search box and support type to jump", async ({ page, sql, signInAs }, info) => {
    test.skip(info.project.name !== "desktop", "keyboard only");
    const vendor = await signInAs("vendor", { fullName: "Dropdown Vendor" });
    await verifiedVendorWithTruck(sql, vendor);
    await page.goto("/vendor/products/new");
    const trigger = page.getByRole("combobox", { name: "Availability" });
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("listbox")).toBeVisible();
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await page.keyboard.press("p");
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveText(/Paused/);
    await expect(trigger).toBeFocused();
    await expect(page.locator('input[name="status"]')).toHaveValue("paused");
  });
});
