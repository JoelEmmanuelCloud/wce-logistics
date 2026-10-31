import path from "node:path";
import type { Browser, Page } from "@playwright/test";
import type postgres from "postgres";
import { createSessionFor, emailsTo, expect, readOtp, test, uniqueEmail, type TestUser } from "./support/fixtures";
import { addDriver, lagosDate, paidBooking } from "./support/marketplace";
import { pickOption } from "./support/select";

const PNG = path.join(__dirname, "fixtures", "truck.png");

async function pageFor(browser: Browser, sql: postgres.Sql, user: TestUser): Promise<Page> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await createSessionFor(sql, page, user.id);
  return page;
}

async function record(page: Page, step: string, extra?: (page: Page) => Promise<void>) {
  await page.getByRole("radio", { name: new RegExp(`^${step}`) }).check();
  await extra?.(page);
  await page.getByRole("button", { name: `Record: ${step}` }).click();
  await expect(page.getByText(`${step} recorded.`, { exact: true }).or(page.getByText("Delivery complete"))).toBeVisible();
}

async function payoutStatus(sql: postgres.Sql, bookingId: string): Promise<string> {
  const [row] = await sql<{ status: string }[]>`select status from payouts where booking_id = ${bookingId}`;
  return row.status;
}

test.describe("delivery operations", () => {
  test.skip(({ isMobile }) => isMobile, "covered on desktop");

  test("vendor adds a driver who carries the shipment from pickup to a reviewed, paid-out delivery", async ({ browser, page, sql, signInAs, createUser }) => {
    test.slow();
    const vendorUser = await signInAs("vendor", { fullName: "Haulage Boss" });
    const shipper = await createUser("customer", "Amina Yusuf");
    const { bookingId, reference, vendorShareKobo } = await paidBooking(sql, vendorUser, shipper);
    const driverEmail = uniqueEmail("driver");

    await page.goto("/vendor/drivers/new");
    await page.getByLabel("Full name").fill("Musa Bello");
    await page.getByLabel("Email address").fill(driverEmail);
    await page.getByLabel("Mobile number").fill("0803 444 0199");
    await page.getByLabel("Driver's licence number").fill(`LAG ${Date.now().toString().slice(-8)} AB`);
    await pickOption(page.getByLabel("Licence class"), "E");
    await page.getByLabel("Licence expiry date").fill(lagosDate(400));
    await page.getByRole("button", { name: "Add driver" }).click();
    await expect(page).toHaveURL(/\/vendor\/drivers\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Musa Bello");
    await expect.poll(async () => (await emailsTo(driverEmail)).map((email) => email.subject)).toContain("Haulage Boss Haulage added you as a driver on WCE Logistics");

    await page.goto("/vendor/drivers/new");
    await page.getByLabel("Full name").fill("Someone Else");
    await page.getByLabel("Email address").fill(shipper.email);
    await page.getByLabel("Mobile number").fill("0803 444 0200");
    await page.getByLabel("Driver's licence number").fill("ZZZ99999999");
    await pickOption(page.getByLabel("Licence class"), "G");
    await page.getByLabel("Licence expiry date").fill(lagosDate(400));
    await page.getByRole("button", { name: "Add driver" }).click();
    await expect(page.getByText("This email already belongs to a WCE Logistics account.")).toBeVisible();

    await page.goto(`/vendor/bookings/${bookingId}`);
    await expect(page.getByText("Assign a driver")).toBeVisible();
    await pickOption(page.getByLabel("Driver"), { label: "Musa Bello, class E" });
    await page.getByRole("button", { name: "Assign driver" }).click();
    await expect(page.getByText("Driver assigned. The shipper and the driver have been emailed.")).toBeVisible();
    await expect.poll(async () => (await emailsTo(shipper.email)).map((email) => email.subject)).toContain(`Driver assigned to ${reference}`);

    const driverPage = await (await browser.newContext()).newPage();
    await driverPage.goto("/sign-in");
    await driverPage.getByLabel("Email address").fill(driverEmail);
    await driverPage.getByRole("button", { name: "Continue" }).click();
    await driverPage.getByLabel("Verification code").fill(await readOtp(driverEmail));
    await driverPage.getByRole("button", { name: "Verify and continue" }).click();
    await expect(driverPage).toHaveURL(/\/driver$/);
    await expect(driverPage.getByRole("heading", { level: 1 })).toHaveText("Hello, Musa");
    await driverPage.getByRole("link", { name: new RegExp(reference) }).click();
    await expect(driverPage.getByText("Shipper's phone")).toBeVisible();
    await expect(driverPage.getByText("₦")).toHaveCount(0);

    await record(driverPage, "Arrived at pickup");
    await record(driverPage, "Goods collected", async (current) => {
      await current.getByLabel("Note").fill("20 cartons loaded and strapped.");
      await current.getByLabel(/^Photo/).setInputFiles(PNG);
    });
    await expect.poll(async () => (await emailsTo(shipper.email)).map((email) => email.subject)).toContain(`Goods collected for ${reference}`);
    await record(driverPage, "Departed for destination");
    await record(driverPage, "Report an incident", async (current) => {
      await current.getByLabel("What happened").fill("Two hour delay at the Jebba checkpoint.");
    });
    await record(driverPage, "Delivered", async (current) => {
      await current.getByLabel("Received by").fill("Chika Eze");
    });
    await expect(driverPage.getByText("Delivery complete")).toBeVisible();

    const shipperPage = await pageFor(browser, sql, shipper);
    await shipperPage.goto(`/account/bookings/${bookingId}`);
    await expect(shipperPage.getByText("Received by Chika Eze", { exact: true })).toBeVisible();
    await expect(shipperPage.getByText("Two hour delay at the Jebba checkpoint.")).toBeVisible();
    const photoLink = shipperPage.getByRole("link", { name: "View photo" });
    const photo = await shipperPage.request.get((await photoLink.getAttribute("href")) ?? "", { maxRedirects: 0 });
    expect(photo.status()).toBe(303);

    const stranger = await createUser("customer", "Nosy Shipper");
    const strangerPage = await pageFor(browser, sql, stranger);
    const denied = await strangerPage.request.get((await photoLink.getAttribute("href")) ?? "", { maxRedirects: 0 });
    expect(denied.status()).toBe(404);

    expect(await payoutStatus(sql, bookingId)).toBe("on_hold");
    await shipperPage.getByRole("button", { name: "Confirm receipt" }).click();
    await expect(shipperPage.getByText("Rate this delivery")).toBeVisible();
    expect(await payoutStatus(sql, bookingId)).toBe("eligible");

    await shipperPage.locator("label").filter({ hasText: "Excellent" }).click();
    await shipperPage.getByLabel("Comments").fill("Careful driver, arrived on time.");
    await shipperPage.getByRole("button", { name: "Submit review" }).click();
    await expect(shipperPage.getByText("Your review")).toBeVisible();
    await expect(shipperPage.getByText("Careful driver, arrived on time.")).toBeVisible();

    await page.goto("/vendor/reviews");
    await expect(page.getByText("Careful driver, arrived on time.")).toBeVisible();
    await expect(page.getByText(/from 1 review$/)).toBeVisible();

    const admin = await createUser("admin", "Payout Admin");
    const adminPage = await pageFor(browser, sql, admin);
    await adminPage.goto("/admin/payouts");
    const payoutRow = adminPage.getByRole("row").filter({ hasText: reference });
    await expect(payoutRow.getByText(`₦${(vendorShareKobo / 100).toLocaleString("en-NG")}`)).toBeVisible();
    await payoutRow.getByRole("button", { name: "Mark paid" }).click();
    await payoutRow.getByLabel("Bank transfer reference").fill("ACCESS-TRF-55120");
    await payoutRow.getByRole("button", { name: "Confirm payout" }).click();
    await expect(payoutRow.getByText("Paid out")).toBeVisible();
  });

  test("a dispute holds the payout until an administrator resolves it", async ({ browser, sql, createUser }) => {
    test.slow();
    const vendorUser = await createUser("vendor", "Dispute Vendor");
    const shipper = await createUser("customer", "Bola Ade");
    const { bookingId, reference, vendorId } = await paidBooking(sql, vendorUser, shipper);
    const driverId = await addDriver(sql, vendorId, await createUser("customer", "Dispute Driver"));
    await sql`update bookings set status = 'delivered', delivered_at = now(), driver_id = ${driverId} where id = ${bookingId}`;

    const shipperPage = await pageFor(browser, sql, shipper);
    await shipperPage.goto(`/account/bookings/${bookingId}`);
    await shipperPage.getByRole("link", { name: "Report a problem" }).click();
    await expect(shipperPage).toHaveURL(/\/dispute$/);
    await pickOption(shipperPage.getByLabel("What went wrong?"), "damaged_goods");
    await shipperPage.getByLabel("Describe the problem").fill("Four cartons of tiles arrived cracked and unusable.");
    await shipperPage.getByLabel("Evidence").setInputFiles(PNG);
    await shipperPage.getByRole("button", { name: "Open dispute" }).click();
    await expect(shipperPage.getByText("Damaged goods")).toBeVisible();
    await expect(shipperPage.getByRole("link", { name: "truck.png" })).toBeVisible();
    await expect.poll(async () => (await emailsTo(vendorUser.email)).map((email) => email.subject)).toContain(`Problem reported on ${reference}`);

    await shipperPage.goto(`/account/bookings/${bookingId}`);
    await expect(shipperPage.getByText("Dispute open")).toBeVisible();
    await shipperPage.getByRole("button", { name: "Confirm receipt" }).click();
    await expect(shipperPage.getByText("Rate this delivery")).toBeVisible();
    expect(await payoutStatus(sql, bookingId)).toBe("on_hold");

    const vendorPage = await pageFor(browser, sql, vendorUser);
    await vendorPage.goto(`/vendor/bookings/${bookingId}`);
    await vendorPage.getByRole("link", { name: "View dispute" }).click();
    await vendorPage.getByLabel("Your message").fill("The cartons were packed with foam. We will share loading photos.");
    await vendorPage.getByRole("button", { name: "Send message" }).click();
    await expect(vendorPage.getByText("Message sent.")).toBeVisible();
    await expect.poll(async () => (await emailsTo(shipper.email)).map((email) => email.subject)).toContain(`New message on the dispute for ${reference}`);

    const admin = await createUser("admin", "Dispute Admin");
    const adminPage = await pageFor(browser, sql, admin);
    await adminPage.goto("/admin/disputes");
    await adminPage.getByRole("link", { name: reference }).click();
    await adminPage.getByRole("button", { name: "Assign to me" }).click();
    await expect(adminPage.getByText("Assigned to you.")).toBeVisible();
    await pickOption(adminPage.getByLabel("Status"), "awaiting_information");
    await adminPage.getByRole("button", { name: "Update status" }).click();
    await expect(adminPage.getByText("Dispute updated. Both parties have been emailed.")).toBeVisible();

    await shipperPage.goto(`/account/bookings/${bookingId}/dispute`);
    await shipperPage.getByLabel("Your message").fill("Photos of the cracked tiles are attached.");
    await shipperPage.getByLabel("Evidence").setInputFiles(PNG);
    await shipperPage.getByRole("button", { name: "Send message" }).click();
    await expect(shipperPage.getByText("Message sent.")).toBeVisible();
    const [reopened] = await sql<{ status: string }[]>`select status from disputes where booking_id = ${bookingId}`;
    expect(reopened.status).toBe("under_review");

    await adminPage.reload();
    await pickOption(adminPage.getByLabel("Status"), "resolved");
    await adminPage.getByLabel("Outcome").fill("Vendor agreed to replace four cartons on the next trip. Payout released.");
    await adminPage.getByRole("button", { name: "Close dispute" }).click();
    await expect.poll(() => payoutStatus(sql, bookingId)).toBe("eligible");
    await expect(adminPage.getByText("Vendor agreed to replace four cartons on the next trip. Payout released.").first()).toBeVisible();
    await expect.poll(async () => (await emailsTo(shipper.email)).map((email) => email.subject)).toContain(`Dispute update for ${reference}`);

    await shipperPage.reload();
    await expect(shipperPage.getByText("Vendor agreed to replace four cartons on the next trip. Payout released.").first()).toBeVisible();
    await expect(shipperPage.getByLabel("Your message")).toHaveCount(0);
  });

  test("drivers see only their own deliveries and licences must cover the truck", async ({ browser, sql, createUser }) => {
    test.slow();
    const vendorUser = await createUser("vendor", "Strict Vendor");
    const shipper = await createUser("customer", "Strict Shipper");
    const { bookingId, vendorId } = await paidBooking(sql, vendorUser, shipper);
    const carrier = await createUser("customer", "Assigned Driver");
    const other = await createUser("customer", "Other Driver");
    const lightOnly = await createUser("customer", "Light Licence");
    const expiring = await createUser("customer", "Expiring Licence");
    await addDriver(sql, vendorId, carrier);
    const otherId = await addDriver(sql, vendorId, other);
    await addDriver(sql, vendorId, lightOnly, { licenceClass: "C" });
    await addDriver(sql, vendorId, expiring, { expiresInDays: 2 });

    const vendorPage = await pageFor(browser, sql, vendorUser);
    await vendorPage.goto(`/vendor/bookings/${bookingId}`);
    const select = vendorPage.getByLabel("Driver");
    await select.click();
    const lightLicence = vendorPage.getByRole("option", { name: /Light Licence/ });
    await expect(lightLicence).toHaveAttribute("aria-disabled", "true");
    await expect(lightLicence).toContainText("does not cover this truck");
    await expect(vendorPage.getByRole("option", { name: /Expiring Licence/ })).toContainText("expires before the trip departs");
    await vendorPage.keyboard.press("Escape");
    await pickOption(select, { label: "Assigned Driver, class E" });
    await vendorPage.getByRole("button", { name: "Assign driver" }).click();
    await expect(vendorPage.getByText("Driver assigned.", { exact: false })).toBeVisible();

    const otherPage = await pageFor(browser, sql, other);
    await otherPage.goto(`/driver/deliveries/${bookingId}`);
    await expect(otherPage.getByText("This road does not exist.")).toBeVisible();

    const carrierPage = await pageFor(browser, sql, carrier);
    await carrierPage.goto(`/driver/deliveries/${bookingId}`);
    await record(carrierPage, "Goods collected");

    const [carrierDriver] = await sql<{ id: string }[]>`select id from drivers where user_id = ${carrier.id}`;
    await vendorPage.goto(`/vendor/drivers/${carrierDriver.id}`);
    await vendorPage.getByRole("button", { name: "Deactivate driver" }).click();
    await expect(vendorPage.getByText("This driver has deliveries in progress.", { exact: false })).toBeVisible();

    await vendorPage.goto(`/vendor/drivers/${otherId}`);
    await vendorPage.getByRole("button", { name: "Deactivate driver" }).click();
    await expect(vendorPage.getByRole("button", { name: "Reactivate driver" })).toBeVisible();
    await otherPage.goto("/driver");
    await expect(otherPage.getByText("Your driver account is not active")).toBeVisible();

    await vendorPage.goto(`/vendor/bookings/${bookingId}`);
    await expect(vendorPage.getByLabel("Driver")).toHaveCount(0);
    const shipperPage = await pageFor(browser, sql, shipper);
    await shipperPage.goto(`/account/bookings/${bookingId}`);
    await expect(shipperPage.getByRole("button", { name: "Cancel booking" })).toHaveCount(0);
  });
});
