import type { Browser, Page } from "@playwright/test";
import type postgres from "postgres";
import { fakePaystackPort } from "./support/env";
import { createSessionFor, emailsTo, expect, test, type TestUser } from "./support/fixtures";
import { paidBooking } from "./support/marketplace";
import { pickOption } from "./support/select";

async function pageFor(browser: Browser, sql: postgres.Sql, user: TestUser): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await createSessionFor(sql, page, user.id);
  return page;
}

async function completedBooking(sql: postgres.Sql, vendorUser: TestUser, shipper: TestUser) {
  const booking = await paidBooking(sql, vendorUser, shipper);
  await sql`update bookings set status = 'completed', completed_at = now() where id = ${booking.bookingId}`;
  await sql`update payouts set status = 'eligible' where booking_id = ${booking.bookingId}`;
  return booking;
}

async function payout(sql: postgres.Sql, bookingId: string) {
  const [row] = await sql<{ status: string; provider_reference: string | null; failure_reason: string | null }[]>`
    select status, provider_reference, failure_reason from payouts where booking_id = ${bookingId}`;
  return row;
}

async function completeTransfer(reference: string, status: "success" | "failed") {
  const response = await fetch(`http://127.0.0.1:${fakePaystackPort}/transfers/${reference}/complete?status=${status}`, { method: "POST" });
  expect(response.status).toBe(200);
}

async function addBankAccount(page: Page, accountNumber: string) {
  await page.goto("/vendor/payouts/account");
  await pickOption(page.getByLabel("Bank"), { label: "Guaranty Trust Bank" });
  await page.getByLabel("Account number").fill(accountNumber);
  await page.getByRole("button", { name: "Verify and save" }).click();
}

test.describe("vendor payouts", () => {
  test.skip(({ isMobile }) => isMobile, "covered on desktop");

  test("vendor saves a verified bank account and is paid through Paystack once", async ({ browser, sql, createUser }) => {
    test.slow();
    const vendorUser = await createUser("vendor", "Bank Vendor");
    const shipper = await createUser("customer", "Bank Shipper");
    const { bookingId, reference } = await completedBooking(sql, vendorUser, shipper);
    const vendorPage = await pageFor(browser, sql, vendorUser);

    await vendorPage.goto("/vendor/payouts/account");
    await vendorPage.getByLabel("Bank").click();
    await expect(vendorPage.getByRole("option", { name: "Guaranty Trust Bank" })).toBeVisible();
    await expect(vendorPage.getByRole("option", { name: "Retired Bank" })).toHaveCount(0);
    await vendorPage.keyboard.press("Escape");
    await addBankAccount(vendorPage, "9990001111");
    await expect(vendorPage.getByText("We could not find that account at the selected bank.", { exact: false })).toBeVisible();

    await addBankAccount(vendorPage, "0123 456 789");
    await expect(vendorPage).toHaveURL(/\/vendor\/payouts\?account=saved$/);
    await expect(vendorPage.getByText("Bank account saved")).toBeVisible();
    await expect(vendorPage.getByText("in the name of E2E ACCOUNT 6789", { exact: false })).toBeVisible();
    await expect.poll(async () => (await emailsTo(vendorUser.email)).map((email) => email.subject)).toContain("Your payout bank account was updated");
    const [stored] = await sql<{ account_number_encrypted: string; account_number_last4: string }[]>`
      select account_number_encrypted, account_number_last4 from payout_accounts where vendor_id = (select id from vendor_profiles where user_id = ${vendorUser.id})`;
    expect(stored.account_number_last4).toBe("6789");
    expect(stored.account_number_encrypted).not.toContain("0123456789");

    const admin = await createUser("admin", "Transfer Admin");
    const adminPage = await pageFor(browser, sql, admin);
    await adminPage.goto("/admin/payouts");
    const row = adminPage.getByRole("row").filter({ hasText: reference });
    await expect(row.getByText("Guaranty Trust Bank, ending 6789, E2E ACCOUNT 6789")).toBeVisible();
    await row.getByRole("button", { name: "Pay with Paystack" }).click();
    await expect(row.getByText("Send ₦10,800 to Guaranty Trust Bank, ending 6789?")).toBeVisible();
    await row.getByRole("button", { name: "Send transfer" }).click();
    await expect(row.getByText("Transfer in progress")).toBeVisible();
    await expect(row.getByRole("button", { name: "Mark paid" })).toHaveCount(0);

    const started = await payout(sql, bookingId);
    expect(started.status).toBe("processing");
    expect(started.provider_reference).toMatch(/^wce-po-[0-9a-f]{24}$/);

    await completeTransfer(started.provider_reference ?? "", "success");
    await expect.poll(async () => (await payout(sql, bookingId)).status).toBe("paid");
    await completeTransfer(started.provider_reference ?? "", "success");
    const subject = `₦10,800 paid for ${reference}`;
    await expect.poll(async () => (await emailsTo(vendorUser.email)).filter((email) => email.subject === subject).length).toBe(1);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect((await emailsTo(vendorUser.email)).filter((email) => email.subject === subject)).toHaveLength(1);

    await vendorPage.goto("/vendor/payouts");
    await expect(vendorPage.getByText("Paid out")).toBeVisible();
  });

  test("a failed transfer returns the payout to the queue with the reason", async ({ browser, sql, createUser }) => {
    test.slow();
    const vendorUser = await createUser("vendor", "Retry Vendor");
    const shipper = await createUser("customer", "Retry Shipper");
    const { bookingId, reference } = await completedBooking(sql, vendorUser, shipper);
    const vendorPage = await pageFor(browser, sql, vendorUser);
    await addBankAccount(vendorPage, "0198765432");
    await expect(vendorPage).toHaveURL(/\/vendor\/payouts\?account=saved$/);

    const admin = await createUser("admin", "Retry Admin");
    const adminPage = await pageFor(browser, sql, admin);
    await adminPage.goto("/admin/payouts");
    const row = adminPage.getByRole("row").filter({ hasText: reference });
    await row.getByRole("button", { name: "Pay with Paystack" }).click();
    await row.getByRole("button", { name: "Send transfer" }).click();
    await expect(row.getByText("Transfer in progress")).toBeVisible();

    const first = await payout(sql, bookingId);
    await completeTransfer(first.provider_reference ?? "", "failed");
    await expect.poll(async () => (await payout(sql, bookingId)).status).toBe("eligible");
    expect((await payout(sql, bookingId)).failure_reason).toContain("Paystack transfer failed");

    await adminPage.reload();
    await expect(row.getByText("Paystack transfer failed: Account could not be credited")).toBeVisible();
    await row.getByRole("button", { name: "Pay with Paystack" }).click();
    await row.getByRole("button", { name: "Send transfer" }).click();
    await expect(row.getByText("Transfer in progress")).toBeVisible();
    const second = await payout(sql, bookingId);
    expect(second.provider_reference).not.toBe(first.provider_reference);
  });

  test("vendors without a bank account can only be paid manually", async ({ browser, sql, createUser }) => {
    const vendorUser = await createUser("vendor", "Manual Vendor");
    const shipper = await createUser("customer", "Manual Shipper");
    const { reference } = await completedBooking(sql, vendorUser, shipper);
    const admin = await createUser("admin", "Manual Admin");
    const adminPage = await pageFor(browser, sql, admin);
    await adminPage.goto("/admin/payouts");
    const row = adminPage.getByRole("row").filter({ hasText: reference });
    await expect(row.getByText("No bank account yet")).toBeVisible();
    await expect(row.getByRole("button", { name: "Pay with Paystack" })).toHaveCount(0);
    await expect(row.getByRole("button", { name: "Mark paid" })).toBeVisible();
  });
});
