import type postgres from "postgres";
import { createSessionFor, expect, test } from "./support/fixtures";
import { lagosDate, verifiedVendorWithTruck } from "./support/marketplace";

async function listProduct(sql: postgres.Sql, vendorId: string, title: string, stock = 100) {
  await sql`insert into delivery_rates (vendor_id, destination_state, rate_per_tonne_kobo, minimum_charge_kobo) values (${vendorId}, 'Kano', 5000000, 1000000) on conflict do nothing`;
  const [product] = await sql<{ id: string }[]>`
    insert into products (vendor_id, title, description, category, unit_label, unit_weight_kg, price_kobo, stock_units, min_order_units)
    values (${vendorId}, ${title}, 'Sealed bags of test cement ready to load at the yard.', 'construction_materials', '50 kg bag', 50, 1000000, ${stock}, 2)
    returning id`;
  return product.id;
}

async function stockOf(sql: postgres.Sql, productId: string) {
  const [row] = await sql<{ stock_units: number }[]>`select stock_units from products where id = ${productId}`;
  return row.stock_units;
}

test.describe("shop", () => {
  test.skip(({ isMobile }) => isMobile, "covered on desktop");

  test("a buyer orders, the seller schedules delivery and the order becomes a payable booking", async ({ browser, page, sql, signInAs, createUser }) => {
    test.slow();
    const seller = await signInAs("vendor", { fullName: "Bola Stores" });
    const { vendorId, registration } = await verifiedVendorWithTruck(sql, seller);
    const title = `Test cement ${Date.now()}`;
    const productId = await listProduct(sql, vendorId, title);

    const buyer = await createUser("customer", "Musa Bello");
    const buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();
    await createSessionFor(sql, buyerPage, buyer.id);

    await buyerPage.goto(`/shop?q=${encodeURIComponent(title)}`);
    await buyerPage.getByLabel("Deliver to").selectOption("Kano");
    await expect(buyerPage.getByText("₦15,000 delivered to Kano")).toBeVisible();
    await expect(buyerPage.getByText("Verified seller", { exact: true })).toBeVisible();
    await buyerPage.getByRole("link", { name: title }).click();
    await expect(buyerPage.getByRole("heading", { level: 1 })).toHaveText(title);
    await buyerPage.getByLabel("Quantity").fill("20");
    await buyerPage.getByRole("button", { name: "Add to cart" }).click();
    await buyerPage.getByRole("link", { name: "View cart and check out" }).click();
    await expect(buyerPage).toHaveURL(/\/cart$/);
    await buyerPage.getByRole("link", { name: "Check out" }).click();

    await buyerPage.getByLabel("Delivery state").selectOption("Kano");
    await expect(buyerPage.getByText("₦250,000")).toBeVisible();
    await buyerPage.getByLabel("Town or city").fill("Nassarawa");
    await buyerPage.getByLabel("Delivery address").fill("4 Zoo Road");
    await buyerPage.getByRole("button", { name: "Place order" }).click();
    await expect(buyerPage).toHaveURL(/\/account\/orders\/[0-9a-f-]{36}$/);
    await expect(buyerPage.getByText("Waiting for the seller")).toBeVisible();
    expect(await stockOf(sql, productId)).toBe(80);

    await page.goto("/vendor/orders");
    await page.getByRole("link", { name: new RegExp(title) }).click();
    await expect(page.getByLabel("Truck")).toContainText(registration);
    await page.getByLabel("Departure date").fill(lagosDate(3));
    await page.getByLabel("Estimated transit time (hours)").fill("30");
    await page.getByRole("button", { name: "Accept order" }).click();
    await expect(page.getByRole("link", { name: "Open delivery booking" })).toBeVisible();

    await buyerPage.reload();
    await expect(buyerPage.getByText("Accepted. Pay to confirm.")).toBeVisible();
    await buyerPage.getByRole("link", { name: "Pay now" }).click();
    await expect(buyerPage).toHaveURL(/\/account\/bookings\/[0-9a-f-]{36}$/);
    await expect(buyerPage.getByText(`20 x ${title} (50 kg bag)`)).toBeVisible();
    await expect(buyerPage.getByText("₦250,000").first()).toBeVisible();

    await buyerPage.goto("/account/shipments");
    await expect(buyerPage.getByText("Nassarawa")).toHaveCount(0);
    await buyerContext.close();
  });

  test("declining an order puts the stock back", async ({ browser, page, sql, signInAs, createUser }) => {
    const seller = await signInAs("vendor", { fullName: "Chika Stores" });
    const { vendorId } = await verifiedVendorWithTruck(sql, seller);
    const title = `Declined cement ${Date.now()}`;
    const productId = await listProduct(sql, vendorId, title, 50);
    const buyer = await createUser("customer", "Ife Ade");
    const buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();
    await createSessionFor(sql, buyerPage, buyer.id);

    await buyerPage.goto(`/shop/${productId}`);
    await buyerPage.getByLabel("Quantity").fill("10");
    await buyerPage.getByRole("button", { name: "Add to cart" }).click();
    await buyerPage.getByRole("link", { name: "View cart and check out" }).click();
    await buyerPage.getByRole("link", { name: "Check out" }).click();
    await buyerPage.getByLabel("Delivery state").selectOption("Kano");
    await buyerPage.getByLabel("Town or city").fill("Fagge");
    await buyerPage.getByLabel("Delivery address").fill("8 Airport Road");
    await buyerPage.getByRole("button", { name: "Place order" }).click();
    await expect(buyerPage.getByText("Waiting for the seller")).toBeVisible();
    expect(await stockOf(sql, productId)).toBe(40);

    await page.goto("/vendor/orders");
    await page.getByRole("link", { name: new RegExp(title) }).click();
    await page.getByRole("button", { name: "Decline order" }).click();
    await page.getByLabel("Why are you declining?").fill("Out of bags this week");
    await page.getByRole("button", { name: "Decline order" }).click();
    await expect(page.getByText("Declined by seller")).toBeVisible();
    expect(await stockOf(sql, productId)).toBe(50);

    await buyerPage.reload();
    await expect(buyerPage.getByText("Out of bags this week")).toBeVisible();
    await buyerContext.close();
  });

  test("a guest is sent to sign in at checkout and the cart keeps one seller", async ({ page, sql, createUser }) => {
    const sellerA = await createUser("vendor", "Dele Traders");
    const sellerB = await createUser("vendor", "Efe Traders");
    const first = await verifiedVendorWithTruck(sql, sellerA);
    const second = await verifiedVendorWithTruck(sql, sellerB);
    const productA = await listProduct(sql, first.vendorId, `Guest cement ${Date.now()}`);
    const productB = await listProduct(sql, second.vendorId, `Other cement ${Date.now()}`);

    await page.goto(`/shop/${productA}`);
    await page.getByLabel("Quantity").fill("4");
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Added to your cart.")).toBeVisible();

    await page.goto(`/shop/${productB}`);
    await page.getByRole("button", { name: "Add to cart" }).click();
    await expect(page.getByText("Your cart has goods from another seller")).toBeVisible();

    await page.goto("/cart");
    await page.getByRole("link", { name: "Check out" }).click();
    await expect(page).toHaveURL(/\/sign-in\?as=customer&next=%2Fcheckout|\/sign-in\?as=customer&next=\/checkout/);
  });
});
