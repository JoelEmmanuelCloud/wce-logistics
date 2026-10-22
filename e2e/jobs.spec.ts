import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { testEnv } from "./support/env";
import { emailsTo, expect, test } from "./support/fixtures";
import { acceptedBooking, addDriver, paidBooking, verifiedVendorWithTruck } from "./support/marketplace";

const run = promisify(execFile);

async function job(name: string): Promise<string> {
  const { stdout } = await run(process.execPath, ["--conditions=react-server", "--import", "tsx", `scripts/${name}.ts`], {
    env: { ...process.env, ...testEnv, NODE_ENV: "production" },
    timeout: 60_000,
  });
  return stdout;
}

test.describe("scheduled jobs", () => {
  test.describe.configure({ mode: "serial" });

  test("expiring an unanswered request emails the shipper and the vendor", async ({ sql, createUser }) => {
    const vendorUser = await createUser("vendor", "Slow Vendor");
    const shipper = await createUser("customer", "Waiting Shipper");
    const { bookingId, reference } = await acceptedBooking(sql, vendorUser, shipper, 300, 2000);
    await sql`update bookings set status = 'pending_vendor_acceptance', response_due_at = now() - interval '1 minute' where id = ${bookingId}`;

    expect(await job("expire-bookings")).toMatch(/Expired [1-9]\d* unanswered booking request/);
    const [booking] = await sql<{ status: string }[]>`select status from bookings where id = ${bookingId}`;
    expect(booking.status).toBe("expired");
    await expect.poll(async () => (await emailsTo(shipper.email)).map((email) => email.subject)).toContain(`Booking ${reference} expired`);
    await expect.poll(async () => (await emailsTo(vendorUser.email)).map((email) => email.subject)).toContain(`Booking request ${reference} expired`);
  });

  test("deliveries complete after 72 hours and release the payout", async ({ sql, createUser }) => {
    const vendorUser = await createUser("vendor", "Patient Vendor");
    const shipper = await createUser("customer", "Quiet Shipper");
    const { bookingId, reference, vendorId } = await paidBooking(sql, vendorUser, shipper);
    const driverId = await addDriver(sql, vendorId, await createUser("customer", "Job Driver"));
    await sql`update bookings set status = 'delivered', driver_id = ${driverId}, delivered_at = now() - interval '73 hours' where id = ${bookingId}`;

    expect(await job("complete-deliveries")).toMatch(/Completed [1-9]\d* delivered booking/);
    const [booking] = await sql<{ status: string }[]>`select status from bookings where id = ${bookingId}`;
    expect(booking.status).toBe("completed");
    const [payout] = await sql<{ status: string }[]>`select status from payouts where booking_id = ${bookingId}`;
    expect(payout.status).toBe("eligible");
    await expect.poll(async () => (await emailsTo(shipper.email)).map((email) => email.subject)).toContain(`${reference} is complete`);
    await expect.poll(async () => (await emailsTo(vendorUser.email)).map((email) => email.subject)).toContain(`${reference} completed`);
  });

  test("trucks with expired documents are taken off the market and the vendor is told", async ({ sql, createUser }) => {
    const vendorUser = await createUser("vendor", "Lapsed Vendor");
    const { truckId, registration } = await verifiedVendorWithTruck(sql, vendorUser);

    expect(await job("expire-documents")).toMatch(/Flagged [1-9]\d* truck/);
    const [truck] = await sql<{ listing_status: string }[]>`select listing_status from trucks where id = ${truckId}`;
    expect(truck.listing_status).toBe("expired_documentation");
    await expect.poll(async () => (await emailsTo(vendorUser.email)).map((email) => email.subject)).toContain(`${registration} is off the market`);
  });
});
