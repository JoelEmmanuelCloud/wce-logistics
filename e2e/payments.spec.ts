import { createHmac } from "node:crypto";
import type { Page } from "@playwright/test";
import type postgres from "postgres";
import { fakePaystackPort, paystackTestSecret } from "./support/env";
import { createSessionFor, emailsTo, expect, test } from "./support/fixtures";
import { acceptedBooking } from "./support/marketplace";

const checkoutUrl = new RegExp(`^http://127\\.0\\.0\\.1:${fakePaystackPort}/checkout/`);

function signed(body: string) {
  return { "Content-Type": "application/json", "x-paystack-signature": createHmac("sha512", paystackTestSecret).update(body).digest("hex") };
}

async function openCheckout(page: Page, bookingId: string): Promise<string> {
  await page.goto(`/account/bookings/${bookingId}`);
  await expect(page.getByText("Pay ₦12,000 to confirm")).toBeVisible();
  await page.getByRole("button", { name: "Pay ₦12,000 now" }).click();
  await expect(page).toHaveURL(checkoutUrl);
  await expect(page.getByText("Pay NGN 12000.00")).toBeVisible();
  return decodeURIComponent(new URL(page.url()).pathname.split("/")[2]);
}

async function paymentRows(sql: postgres.Sql, bookingId: string) {
  return sql<{ status: string; platform_fee_kobo: number | null; vendor_payable_kobo: number | null; channel: string | null }[]>`
    select status, platform_fee_kobo, vendor_payable_kobo, channel from payments where booking_id = ${bookingId} order by created_at`;
}

test.describe("payments", () => {
  test.skip(({ isMobile }) => isMobile, "covered on desktop");

  test("shipper pays online, the booking confirms once and the vendor share is paid out", async ({ browser, page, request, sql, signInAs, createUser }) => {
    test.slow();
    const shipper = await signInAs("customer", { fullName: "Amaka Paid" });
    const vendorUser = await createUser("vendor", "Paystack Vendor");
    const { bookingId, reference } = await acceptedBooking(sql, vendorUser, shipper, 600, 2000);

    const paymentReference = await openCheckout(page, bookingId);
    expect(paymentReference).toMatch(new RegExp(`^${reference}-[A-Z2-9]{6}$`));
    await page.getByRole("button", { name: "Pay now" }).click();
    await expect(page).toHaveURL(new RegExp(`/account/bookings/${bookingId}\\?payment=paid$`));
    await expect(page.getByText("Booking confirmed")).toBeVisible();
    await expect(page.getByText("Payment not completed")).toHaveCount(0);

    const replay = JSON.stringify({ event: "charge.success", data: { reference: paymentReference, amount: 1_200_000, currency: "NGN", status: "success" } });
    const replayed = await request.post("/api/webhooks/paystack", { data: replay, headers: signed(replay) });
    expect(replayed.status()).toBe(200);

    expect(await paymentRows(sql, bookingId)).toEqual([{ status: "successful", platform_fee_kobo: 120_000, vendor_payable_kobo: 1_080_000, channel: "card" }]);
    const [events] = await sql<{ count: number }[]>`select count(*)::int as count from booking_events where booking_id = ${bookingId} and status = 'confirmed'`;
    expect(events.count).toBe(1);
    const [payouts] = await sql<{ count: number; amount: number }[]>`select count(*)::int as count, sum(amount_kobo)::int as amount from payouts where booking_id = ${bookingId}`;
    expect(payouts).toEqual({ count: 1, amount: 1_080_000 });
    await expect
      .poll(async () => (await emailsTo(shipper.email)).filter((email) => email.subject === `Booking ${reference} confirmed`).length)
      .toBe(1);

    const vendorContext = await browser.newContext();
    const vendorPage = await vendorContext.newPage();
    await createSessionFor(sql, vendorPage, vendorUser.id);
    await vendorPage.goto("/vendor/payouts");
    await expect(vendorPage.getByRole("link", { name: reference })).toBeVisible();
    await expect(vendorPage.getByText("₦10,800").first()).toBeVisible();
    await expect(vendorPage.getByText("On hold", { exact: true })).toBeVisible();

    const admin = await createUser("admin", "Payout Admin");
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await createSessionFor(sql, adminPage, admin.id);
    await adminPage.goto("/admin/payments");
    const paymentRow = adminPage.getByRole("row").filter({ hasText: paymentReference });
    await expect(paymentRow.getByText("₦1,200", { exact: true })).toBeVisible();
    await expect(paymentRow.getByText("₦10,800", { exact: true })).toBeVisible();

    await adminPage.goto("/admin/payouts");
    const payoutRow = adminPage.getByRole("row").filter({ hasText: reference });
    await payoutRow.getByRole("button", { name: "Mark paid" }).click();
    await payoutRow.getByLabel("Bank transfer reference").fill("ACCESS-TRF-55120");
    await payoutRow.getByRole("button", { name: "Confirm payout" }).click();
    await expect(payoutRow.getByText("Paid out")).toBeVisible();
    await expect(payoutRow.getByText(/ref ACCESS-TRF-55120/)).toBeVisible();
    await adminContext.close();

    await vendorPage.reload();
    await expect(vendorPage.getByText("Paid out")).toBeVisible();
    await expect(vendorPage.getByText(/reference ACCESS-TRF-55120/)).toBeVisible();
    await vendorContext.close();
  });

  test("the callback settles the payment when the webhook never arrives", async ({ page, sql, signInAs, createUser }) => {
    const shipper = await signInAs("customer", { fullName: "Callback Shipper" });
    const vendorUser = await createUser("vendor", "Callback Vendor");
    const { bookingId } = await acceptedBooking(sql, vendorUser, shipper, 600, 2000);

    const paymentReference = await openCheckout(page, bookingId);
    const response = await fetch(`http://127.0.0.1:${fakePaystackPort}/checkout/${encodeURIComponent(paymentReference)}/pay?webhook=skip`, { method: "POST", redirect: "manual" });
    expect(response.status).toBe(302);
    await page.goto(response.headers.get("location") ?? "");
    await expect(page.getByText("Booking confirmed")).toBeVisible();
    expect((await paymentRows(sql, bookingId)).map((row) => row.status)).toEqual(["successful"]);
  });

  test("an abandoned checkout leaves the booking payable", async ({ page, sql, signInAs, createUser }) => {
    const shipper = await signInAs("customer", { fullName: "Abandoned Shipper" });
    const vendorUser = await createUser("vendor", "Abandon Vendor");
    const { bookingId } = await acceptedBooking(sql, vendorUser, shipper, 600, 2000);

    await openCheckout(page, bookingId);
    await page.getByRole("button", { name: "Cancel payment" }).click();
    await expect(page).toHaveURL(/\?payment=failed$/);
    await expect(page.getByText("Payment not completed")).toBeVisible();
    await expect(page.getByRole("button", { name: "Pay ₦12,000 now" })).toBeVisible();
    expect((await paymentRows(sql, bookingId)).map((row) => row.status)).toEqual(["failed"]);
    const [booking] = await sql<{ status: string }[]>`select status from bookings where id = ${bookingId}`;
    expect(booking.status).toBe("awaiting_payment");
  });

  test("webhooks with a bad signature are rejected", async ({ request }) => {
    const body = JSON.stringify({ event: "charge.success", data: { reference: "WCE-ABCDEFGH-ABCDEF" } });
    const forged = await request.post("/api/webhooks/paystack", { data: body, headers: { "Content-Type": "application/json", "x-paystack-signature": "0".repeat(128) } });
    expect(forged.status()).toBe(401);
    const unsigned = await request.post("/api/webhooks/paystack", { data: body, headers: { "Content-Type": "application/json" } });
    expect(unsigned.status()).toBe(401);
    const unknown = await request.post("/api/webhooks/paystack", { data: body, headers: signed(body) });
    expect(unknown.status()).toBe(200);
  });

  test("a cancelled paid booking is refunded through Paystack", async ({ browser, page, sql, signInAs, createUser }) => {
    test.slow();
    const shipper = await signInAs("customer", { fullName: "Refund Shipper" });
    const vendorUser = await createUser("vendor", "Refund Vendor");
    const { bookingId, reference } = await acceptedBooking(sql, vendorUser, shipper, 600, 2000);

    const paymentReference = await openCheckout(page, bookingId);
    await page.getByRole("button", { name: "Pay now" }).click();
    await expect(page.getByText("Booking confirmed")).toBeVisible();

    await page.getByRole("button", { name: "Cancel booking" }).click();
    await page.getByLabel("Why are you cancelling?").fill("Our customer postponed the order to next month.");
    await page.getByRole("button", { name: "Confirm cancellation" }).click();
    await expect(page.getByText("This booking is closed")).toBeVisible();

    const admin = await createUser("admin", "Refund Admin");
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await createSessionFor(sql, adminPage, admin.id);
    await adminPage.goto("/admin/payments");
    const due = adminPage.locator('section[aria-labelledby="refunds"] > div').filter({ hasText: reference });
    await due.getByRole("button", { name: "Refund" }).click();
    await due.getByLabel("Reason for the refund").fill("Shipper cancelled before pickup.");
    await due.getByRole("button", { name: "Refund through Paystack" }).click();
    await expect(due).toHaveCount(0);
    await expect(adminPage.getByRole("row").filter({ hasText: paymentReference }).getByText("Refunded")).toBeVisible();
    await adminContext.close();

    const refunds = (await (await fetch(`http://127.0.0.1:${fakePaystackPort}/refunds`)).json()) as Array<{ transaction: string; amount: number }>;
    expect(refunds).toContainEqual({ transaction: paymentReference, amount: 1_200_000 });
    const [payout] = await sql<{ status: string }[]>`select status from payouts where booking_id = ${bookingId}`;
    expect(payout.status).toBe("cancelled");
    const [payment] = await sql<{ refunded_kobo: number }[]>`select refunded_kobo from payments where booking_id = ${bookingId}`;
    expect(payment.refunded_kobo).toBe(1_200_000);
  });
});
