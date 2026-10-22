import type { Browser, Page } from "@playwright/test";
import type postgres from "postgres";
import { createSessionFor, expect, test, type TestUser } from "./support/fixtures";
import { acceptedBooking, paidBooking, verifiedVendorWithTruck } from "./support/marketplace";

async function pageFor(browser: Browser, sql: postgres.Sql, user: TestUser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await createSessionFor(sql, page, user.id);
  return page;
}

test.describe("admin settings and reports", () => {
  test.describe.configure({ mode: "serial" });

  test.afterAll(async ({ sql }) => {
    await sql`update platform_settings set commission_bps = 1000, min_shipment_kg = 50, response_window_hours = 24, auto_complete_hours = 72, dispute_window_days = 14, disabled_truck_categories = '{}'`;
    await sql`delete from cargo_categories where value = 'pharmaceuticals'`;
    await sql`update cargo_categories set active = true, label = 'Furniture' where value = 'furniture'`;
  });

  test("changes to marketplace rules apply to new shipments, trucks, bookings and payments", async ({ browser, sql, createUser }) => {
    test.slow();
    const admin = await createUser("admin", "Settings Admin");
    const adminPage = await pageFor(browser, sql, admin);
    await adminPage.goto("/admin/settings");

    await adminPage.getByLabel("Platform commission (%)").fill("60");
    await adminPage.getByRole("button", { name: "Save settings" }).click();
    await expect(adminPage.getByText("Commission must be between 0% and 50%.")).toBeVisible();

    await adminPage.getByLabel("Platform commission (%)").fill("7.5");
    await adminPage.getByLabel("Minimum shipment weight (kg)").fill("30");
    await adminPage.getByLabel("Vendor response window (hours)").fill("12");
    await adminPage.getByLabel("Automatic completion (hours after delivery)").fill("48");
    await adminPage.getByLabel("Dispute window (days)").fill("10");
    await adminPage.getByLabel("Tipper truck").uncheck();
    await adminPage.getByRole("button", { name: "Save settings" }).click();
    await expect(adminPage.getByText("Settings saved.", { exact: false })).toBeVisible();
    await expect(adminPage.getByText("Commission: 10% to 7.5%", { exact: false })).toBeVisible();
    await expect(adminPage.getByText("Disabled truck categories: none to Tipper truck", { exact: false })).toBeVisible();

    await adminPage.getByLabel("New cargo category").fill("Pharmaceuticals");
    await adminPage.getByRole("button", { name: "Add category" }).click();
    await expect(adminPage.getByText('Added "Pharmaceuticals".')).toBeVisible();
    const furniture = adminPage.getByRole("listitem").filter({ has: adminPage.locator('input[value="Furniture"]') });
    await furniture.getByRole("button", { name: "Retire" }).click();
    await expect(furniture.getByText("Category retired.", { exact: false })).toBeVisible();

    const shipper = await createUser("customer", "Policy Shipper");
    const shipperPage = await pageFor(browser, sql, shipper);
    await shipperPage.goto("/account/shipments/new");
    await expect(shipperPage.getByText("Minimum 30 kg.")).toBeVisible();
    const cargo = shipperPage.getByLabel("Cargo type");
    await expect(cargo.locator("option", { hasText: "Pharmaceuticals" })).toHaveCount(1);
    await expect(cargo.locator("option", { hasText: "Furniture" })).toHaveCount(0);

    const vendorUser = await createUser("vendor", "Policy Vendor");
    await verifiedVendorWithTruck(sql, vendorUser);
    const vendorPage = await pageFor(browser, sql, vendorUser);
    await vendorPage.goto("/vendor/trucks/new");
    await expect(vendorPage.getByLabel("Truck category").locator("option", { hasText: "Tipper truck" })).toHaveCount(0);
    await expect(vendorPage.getByLabel("Pharmaceuticals")).toBeVisible();

    const requester = await createUser("customer", "Window Shipper");
    const windowVendor = await createUser("vendor", "Window Vendor");
    const { bookingId: requestId } = await acceptedBooking(sql, windowVendor, requester, 60, 2000);
    await sql`update bookings set status = 'pending_vendor_acceptance' where id = ${requestId}`;
    const vendorRequests = await pageFor(browser, sql, windowVendor);
    await vendorRequests.goto("/vendor/bookings");
    await expect(vendorRequests.getByText("Answer new requests within 12 hours.", { exact: false })).toBeVisible();

    const payer = await createUser("customer", "Commission Shipper");
    const commissionVendor = await createUser("vendor", "Commission Vendor");
    const { bookingId, reference } = await acceptedBooking(sql, commissionVendor, payer, 600, 2000);
    await adminPage.goto(`/admin/bookings/${bookingId}`);
    await adminPage.getByRole("button", { name: "Record offline payment" }).click();
    await adminPage.getByLabel("Bank transfer or receipt reference").fill("ZEN-TRF-7788");
    await adminPage.getByRole("button", { name: "Confirm payment received" }).click();
    await expect(adminPage.locator("header").getByText("Confirmed", { exact: true })).toBeVisible();
    const [payment] = await sql<{ platform_fee_kobo: number; vendor_payable_kobo: number }[]>`
      select platform_fee_kobo, vendor_payable_kobo from payments where booking_id = ${bookingId}`;
    expect(payment).toEqual({ platform_fee_kobo: 90_000, vendor_payable_kobo: 1_110_000 });
    expect(reference).toMatch(/^WCE-/);
  });

  test("reports show marketplace figures and export safe CSV files to admins only", async ({ browser, sql, createUser }) => {
    test.slow();
    const vendorUser = await createUser("vendor", "=SUM(1+1)");
    const shipper = await createUser("customer", "Report Shipper");
    const { reference } = await paidBooking(sql, vendorUser, shipper);

    const admin = await createUser("admin", "Report Admin");
    const adminPage = await pageFor(browser, sql, admin);
    await adminPage.goto("/admin/reports?range=7d");
    await expect(adminPage.getByRole("link", { name: "Last 7 days" })).toHaveAttribute("aria-current", "page");
    await expect(adminPage.getByText("Gross booking value", { exact: true })).toBeVisible();
    await expect(adminPage.getByRole("heading", { name: "Gross booking value by day" })).toBeVisible();
    await expect(adminPage.getByText("Owed to vendors now")).toBeVisible();
    await expect(adminPage.getByRole("table", { name: "Gross booking value by day" }).getByRole("row")).toHaveCount(8);

    const payments = await adminPage.request.get("/admin/reports/export/payments?range=7d");
    expect(payments.status()).toBe(200);
    expect(payments.headers()["content-type"]).toContain("text/csv");
    expect(payments.headers()["content-disposition"]).toMatch(/attachment; filename="wce-payments-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.csv"/);
    const csv = await payments.text();
    const line = csv.split("\r\n").find((row) => row.includes(reference)) ?? "";
    expect(line).toContain(`"'=SUM(1+1) Haulage"`);
    expect(line).toContain(",12000,1200,10800,0");

    const bookings = await adminPage.request.get("/admin/reports/export/bookings?range=7d");
    expect(await bookings.text()).toContain(reference);

    const unknown = await adminPage.request.get("/admin/reports/export/users?range=7d");
    expect(unknown.status()).toBe(404);
    const shipperPage = await pageFor(browser, sql, shipper);
    const denied = await shipperPage.request.get("/admin/reports/export/payments?range=7d");
    expect(denied.status()).toBe(404);
  });
});
