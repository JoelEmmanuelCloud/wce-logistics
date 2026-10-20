import type { Page } from "@playwright/test";
import type postgres from "postgres";
import { NIGERIAN_STATES } from "../src/data/nigeria-states";
import { createSessionFor, expect, test, type TestUser } from "./support/fixtures";

function corridor(): [string, string] {
  const from = NIGERIAN_STATES[Math.floor(Math.random() * NIGERIAN_STATES.length)];
  const others = NIGERIAN_STATES.filter((state) => state !== from);
  return [from, others[Math.floor(Math.random() * others.length)]];
}

function lagosDate(offsetDays: number): string {
  return new Date(Date.now() + 3_600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

function plate(): string {
  const letters = () => String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `LND-${Math.floor(100 + Math.random() * 900)}${letters()}${letters()}`;
}

async function verifiedVendorWithTruck(sql: postgres.Sql, user: TestUser) {
  const [vendor] = await sql<{ id: string }[]>`
    insert into vendor_profiles (user_id, category, legal_name, business_name, email, address_line, city, state, operating_states, id_document_type, id_document_reference_last4, verification_status, submitted_at, reviewed_at)
    values (${user.id}, 'logistics_company', ${user.fullName}, ${`${user.fullName} Haulage`}, ${`ops${Date.now()}${Math.random()}@example.com`}, '1 Wharf Road', 'Apapa', 'Lagos', ${["Lagos", "Kano"]}, 'nin', '1234', 'verified', now(), now())
    returning id`;
  const registration = plate();
  const [truck] = await sql<{ id: string }[]>`
    insert into trucks (vendor_id, registration_number, registration_normalized, make, model, year, category, tyre_count, max_payload_kg, body_type, cargo_types, base_state, base_city, listing_status, submitted_at, reviewed_at)
    values (${vendor.id}, ${registration}, ${registration.replace(/[^A-Z0-9]/g, "")}, 'DAF', 'XF 480', 2021, 'heavy_duty', 10, 20000, 'enclosed', ${["general_goods", "machinery"]}, 'Lagos', 'Apapa', 'active', now(), now())
    returning id`;
  return { vendorId: vendor.id, truckId: truck.id, registration };
}

async function scheduleTrip(page: Page, origin: string, destination: string, departure: string, capacity: string) {
  await page.goto("/vendor/routes/new");
  await page.getByLabel("Departure date").fill(departure);
  await page.getByRole("combobox", { name: "State", exact: true }).first().selectOption(origin);
  await page.getByRole("combobox", { name: "State", exact: true }).nth(1).selectOption(destination);
  await page.getByLabel("Town or city").nth(1).fill(`${destination} Central`);
  await page.getByLabel("Capacity offered (kg)").fill(capacity);
  await page.getByLabel("Estimated transit time (hours)").fill("30");
  await page.getByLabel("Rate per kg").fill("20");
  await page.getByLabel("Minimum charge").fill("5000");
  await page.getByLabel("Whole-truck price").fill("300000");
  await page.getByRole("button", { name: "Publish trip" }).click();
  await expect(page).toHaveURL(/\/vendor\/routes$/);
}

async function createShipment(sql: postgres.Sql, customerId: string, weightKg: number, pickupDate: string, from: string, to: string) {
  const [shipment] = await sql<{ id: string }[]>`
    insert into shipments (customer_id, origin_state, origin_city, origin_address, destination_state, destination_city, destination_address, cargo_type, description, weight_kg, package_count, pickup_date, booking_type)
    values (${customerId}, ${from}, ${`${from} Central`}, '12 Market Road', ${to}, ${`${to} Central`}, '3 Station Road', 'general_goods', 'Cartons of tiles', ${weightKg}, 20, ${pickupDate}, 'shared')
    returning id`;
  return shipment.id;
}

test.describe("marketplace", () => {
  test.skip(({ isMobile }) => isMobile, "covered on desktop");

  test("shipper books a verified truck, vendor accepts and admin records payment", async ({ browser, page, sql, signInAs, createUser }) => {
    test.slow();
    const [from, to] = corridor();
    const vendorUser = await signInAs("vendor", { fullName: "Kunle Ade" });
    await verifiedVendorWithTruck(sql, vendorUser);
    await scheduleTrip(page, from, to, lagosDate(5), "1000");
    await expect(page.getByText("Open for bookings")).toBeVisible();

    const shipper = await createUser("customer", "Ngozi Obi");
    const shipperContext = await browser.newContext();
    const shipperPage = await shipperContext.newPage();
    await createSessionFor(sql, shipperPage, shipper.id);
    await shipperPage.goto("/account/shipments/new");
    await shipperPage.getByRole("combobox", { name: "State", exact: true }).first().selectOption(from);
    await shipperPage.getByLabel("Town or city").first().fill("Ikeja");
    await shipperPage.getByLabel("Pickup address").fill("12 Allen Avenue");
    await shipperPage.getByRole("combobox", { name: "State", exact: true }).nth(1).selectOption(to);
    await shipperPage.getByLabel("Town or city").nth(1).fill(`${to} Central`);
    await shipperPage.getByLabel("Delivery address").fill("3 Bompai Road");
    await shipperPage.getByLabel("Cargo type").selectOption("general_goods");
    await shipperPage.getByLabel("Total weight (kg)").fill("40");
    await shipperPage.getByLabel("Number of packages").fill("20");
    await shipperPage.getByLabel("What are you sending?").fill("Cartons of floor tiles");
    await shipperPage.getByLabel("Pickup date").fill(lagosDate(4));
    await shipperPage.getByRole("button", { name: "Find trucks" }).click();
    await expect(shipperPage.getByText("must be at least 50")).toBeVisible();
    await expect(shipperPage.getByLabel("Cargo type")).toHaveValue("general_goods");

    await shipperPage.getByLabel("Total weight (kg)").fill("600");
    await shipperPage.getByRole("button", { name: "Find trucks" }).click();
    await expect(shipperPage).toHaveURL(/\/account\/shipments\/[0-9a-f-]{36}$/);
    await expect(shipperPage.getByText("1 matching truck")).toBeVisible();
    await expect(shipperPage.getByText("₦12,000").first()).toBeVisible();
    await expect(shipperPage.getByText("Transport: 600 kg at ₦20/kg")).toBeVisible();

    await shipperPage.getByRole("button", { name: /Request booking with Kunle Ade Haulage/ }).click();
    await expect(shipperPage).toHaveURL(/\/account\/bookings\/[0-9a-f-]{36}$/);
    await expect(shipperPage.getByText("Waiting for the vendor")).toBeVisible();
    const reference = (await shipperPage.getByRole("heading", { level: 1 }).textContent()) ?? "";
    expect(reference).toMatch(/^WCE-[A-Z2-9]{8}$/);

    await page.goto("/vendor/routes");
    await expect(page.getByText("Booked 600 kg")).toBeVisible();

    const second = await createUser("customer", "Second Shipper");
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await createSessionFor(sql, secondPage, second.id);
    const tooBig = await createShipment(sql, second.id, 500, lagosDate(4), from, to);
    await secondPage.goto(`/account/shipments/${tooBig}`);
    await expect(secondPage.getByText("No matching trucks yet")).toBeVisible();
    await secondContext.close();

    await page.goto("/vendor/bookings");
    await page.getByText(reference).click();
    await page.getByRole("button", { name: "Accept booking" }).click();
    await expect(page.getByText("Waiting for the shipper's payment")).toBeVisible();
    await expect(page.getByText("Ngozi Obi").first()).toBeVisible();

    await shipperPage.reload();
    await expect(shipperPage.getByText("Pay ₦12,000 to confirm")).toBeVisible();

    const admin = await createUser("admin", "Finance Admin");
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await createSessionFor(sql, adminPage, admin.id);
    await adminPage.goto("/admin/bookings");
    await adminPage.getByText(reference).click();
    await adminPage.getByRole("button", { name: "Record offline payment" }).click();
    await adminPage.getByLabel("Bank transfer or receipt reference").fill("GTB-TRF-889201");
    await adminPage.getByRole("button", { name: "Confirm payment received" }).click();
    await expect(adminPage.locator("header").getByText("Confirmed", { exact: true })).toBeVisible();
    await adminContext.close();

    await shipperPage.reload();
    await expect(shipperPage.getByText("Booking confirmed")).toBeVisible();
    await expect(shipperPage.getByText("Payment received offline. Reference: GTB-TRF-889201")).toBeVisible();
    await shipperContext.close();
  });

  test("only one shipper can take the last capacity on a trip", async ({ browser, sql, createUser }) => {
    test.slow();
    const [from, to] = corridor();
    const vendorUser = await createUser("vendor", "Race Vendor");
    const { vendorId, truckId } = await verifiedVendorWithTruck(sql, vendorUser);
    const [route] = await sql<{ id: string }[]>`
      insert into routes (truck_id, vendor_id, origin_state, origin_city, destination_state, destination_city, departure_date, transit_hours, capacity_kg, rate_per_kg_kobo, minimum_charge_kobo)
      values (${truckId}, ${vendorId}, ${from}, 'Depot', ${to}, 'Depot', ${lagosDate(6)}, 30, 1000, 2000, 0)
      returning id`;

    const pages: Page[] = [];
    const shipmentIds: string[] = [];
    for (const name of ["Racer One", "Racer Two"]) {
      const shipper = await createUser("customer", name);
      const context = await browser.newContext();
      const shipperPage = await context.newPage();
      await createSessionFor(sql, shipperPage, shipper.id);
      const shipmentId = await createShipment(sql, shipper.id, 600, lagosDate(5), from, to);
      await shipperPage.goto(`/account/shipments/${shipmentId}`);
      await expect(shipperPage.getByRole("button", { name: /Request booking with Race Vendor Haulage/ })).toBeVisible();
      pages.push(shipperPage);
      shipmentIds.push(shipmentId);
    }

    await Promise.all(pages.map((shipperPage) => shipperPage.getByRole("button", { name: /Request booking with Race Vendor Haulage/ }).click()));
    await expect
      .poll(async () => {
        const [row] = await sql<{ count: number }[]>`select count(*)::int as count from bookings where route_id = ${route.id}`;
        return row.count;
      })
      .toBe(1);

    const [reserved] = await sql<{ reserved_kg: number }[]>`select reserved_kg from routes where id = ${route.id}`;
    expect(reserved.reserved_kg).toBe(600);
    const refusal = "This trip no longer has room for your shipment. Choose another offer.";
    await expect
      .poll(async () => {
        const states = await Promise.all(
          pages.map(async (shipperPage) => ({
            booked: /\/account\/bookings\//.test(shipperPage.url()),
            refused: await shipperPage.getByText(refusal).isVisible(),
          })),
        );
        return states.map((state) => (state.booked ? "booked" : state.refused ? "refused" : "pending")).sort();
      })
      .toEqual(["booked", "refused"]);
    for (const shipperPage of pages) {
      await shipperPage.context().close();
    }
  });

  test("a declined request releases the space and reopens the shipment", async ({ browser, page, sql, signInAs, createUser }) => {
    test.slow();
    const [from, to] = corridor();
    const vendorUser = await signInAs("vendor", { fullName: "Decline Vendor" });
    const { vendorId, truckId } = await verifiedVendorWithTruck(sql, vendorUser);
    const [route] = await sql<{ id: string }[]>`
      insert into routes (truck_id, vendor_id, origin_state, origin_city, destination_state, destination_city, departure_date, transit_hours, capacity_kg, rate_per_kg_kobo, minimum_charge_kobo)
      values (${truckId}, ${vendorId}, ${from}, 'Depot', ${to}, 'Depot', ${lagosDate(7)}, 30, 2000, 2500, 0)
      returning id`;

    const shipper = await createUser("customer", "Hopeful Shipper");
    const shipperContext = await browser.newContext();
    const shipperPage = await shipperContext.newPage();
    await createSessionFor(sql, shipperPage, shipper.id);
    const shipmentId = await createShipment(sql, shipper.id, 300, lagosDate(6), from, to);
    await shipperPage.goto(`/account/shipments/${shipmentId}`);
    await shipperPage.getByRole("button", { name: /Request booking with Decline Vendor Haulage/ }).click();
    await expect(shipperPage).toHaveURL(/\/account\/bookings\//);

    await page.goto("/vendor/bookings");
    await page.getByRole("link", { name: /WCE-/ }).first().click();
    await page.getByRole("button", { name: "Decline" }).click();
    await page.getByLabel("Reason for declining (shown to the shipper)").fill("Truck is booked for maintenance that week.");
    await page.getByRole("button", { name: "Decline request" }).click();
    await expect(page.locator("header").getByText("Declined by vendor", { exact: true })).toBeVisible();

    const [reserved] = await sql<{ reserved_kg: number }[]>`select reserved_kg from routes where id = ${route.id}`;
    expect(reserved.reserved_kg).toBe(0);

    await shipperPage.reload();
    await expect(shipperPage.getByText("Truck is booked for maintenance that week.").first()).toBeVisible();
    await shipperPage.getByRole("link", { name: "Choose another truck" }).click();
    await expect(shipperPage.getByText("Looking for a truck")).toBeVisible();
    await shipperContext.close();
  });
});
