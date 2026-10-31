import { randomUUID } from "node:crypto";
import type postgres from "postgres";
import { createSessionFor, expect, test } from "./support/fixtures";
import { verifiedVendorWithTruck } from "./support/marketplace";

async function addProducts(sql: postgres.Sql, vendorId: string, tag: string, count: number) {
  await sql`insert into delivery_rates (vendor_id, destination_state, rate_per_tonne_kobo) values (${vendorId}, 'Kano', 5000000) on conflict do nothing`;
  const ids: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const [product] = await sql<{ id: string }[]>`
      insert into products (vendor_id, title, description, category, unit_label, unit_weight_kg, price_kobo, stock_units)
      values (${vendorId}, ${`${tag} item ${index + 1}`}, 'Sealed bags of test goods ready to load at the yard.', 'general_goods', '50 kg bag', 50, 1000000, 100)
      returning id`;
    ids.push(product.id);
  }
  return ids;
}

async function addOrders(sql: postgres.Sql, customerId: string, vendorId: string, productId: string, tag: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    const [order] = await sql<{ id: string }[]>`
      insert into orders (reference, customer_id, vendor_id, destination_state, destination_city, destination_address, weight_kg, rate_per_tonne_kobo, goods_kobo, delivery_kobo, total_kobo, response_due_at)
      values (${`WCE-${randomUUID().slice(0, 8).toUpperCase()}`}, ${customerId}, ${vendorId}, 'Kano', 'Fagge', '8 Airport Road', 50, 5000000, 1000000, 250000, 1250000, now() + interval '1 day')
      returning id`;
    await sql`
      insert into order_items (order_id, product_id, title, unit_label, unit_weight_kg, unit_price_kobo, quantity, line_total_kobo)
      values (${order.id}, ${productId}, ${`${tag} order ${index + 1}`}, '50 kg bag', 50, 1000000, 1, 1000000)`;
  }
}

test.describe("pagination", () => {
  test.skip(({ isMobile }) => isMobile, "covered on desktop");

  test("the shop pages through products and keeps the filter", async ({ page, sql, createUser }) => {
    test.slow();
    const seller = await createUser("vendor", "Paged Stores");
    const { vendorId } = await verifiedVendorWithTruck(sql, seller);
    const tag = `Paged${Date.now()}`;
    await addProducts(sql, vendorId, tag, 26);

    await page.goto(`/shop?q=${tag}`);
    await expect(page.getByText("26 products")).toBeVisible();
    await expect(page.locator("main article")).toHaveCount(24);
    await expect(page.getByRole("link", { name: "Previous" })).toHaveCount(0);

    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(new RegExp(`q=${tag}.*page=2`));
    await expect(page.locator("main article")).toHaveCount(2);
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await expect(page.getByRole("link", { name: "Next" })).toHaveCount(0);

    await page.getByRole("link", { name: "Previous" }).click();
    await expect(page.locator("main article")).toHaveCount(24);

    await page.goto(`/shop?q=${tag}&page=999`);
    await expect(page.getByText("Page 2 of 2")).toBeVisible();
    await expect(page.locator("main article")).toHaveCount(2);
  });

  test("buyers and sellers can reach their older orders and products", async ({ browser, page, sql, signInAs, createUser }) => {
    test.slow();
    const seller = await signInAs("vendor", { fullName: "Paged Seller" });
    const { vendorId } = await verifiedVendorWithTruck(sql, seller);
    const tag = `Older${Date.now()}`;
    const [productId] = await addProducts(sql, vendorId, tag, 27);

    await page.goto("/vendor/products");
    await expect(page.getByText("Page 1 of 2, 27 results")).toBeVisible();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page.getByText("Page 2 of 2, 27 results")).toBeVisible();
    await expect(page.locator("main ul > li")).toHaveCount(2);

    const buyer = await createUser("customer", "Paged Buyer");
    await addOrders(sql, buyer.id, vendorId, productId, tag, 27);

    await page.goto("/vendor/orders");
    await expect(page.getByText("Page 1 of 2, 27 results")).toBeVisible();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/status=new.*page=2/);
    await expect(page.getByText("Page 2 of 2, 27 results")).toBeVisible();

    const buyerContext = await browser.newContext();
    const buyerPage = await buyerContext.newPage();
    await createSessionFor(sql, buyerPage, buyer.id);
    await buyerPage.goto("/account/orders");
    await expect(buyerPage.getByText("Page 1 of 2, 27 results")).toBeVisible();
    await buyerPage.getByRole("link", { name: "Next" }).click();
    await expect(buyerPage.getByText("Page 2 of 2, 27 results")).toBeVisible();
    await buyerPage.goto("/account/orders?page=999");
    await expect(buyerPage.getByText("Page 2 of 2, 27 results")).toBeVisible();
    await buyerContext.close();
  });

  test("admins can page through all orders", async ({ page, sql, signInAs, createUser }) => {
    test.slow();
    await signInAs("admin", { fullName: "Paged Admin" });
    const seller = await createUser("vendor", "Paged Vendor");
    const { vendorId } = await verifiedVendorWithTruck(sql, seller);
    const buyer = await createUser("customer", "Admin Paged Buyer");
    const tag = `Admin${Date.now()}`;
    const [productId] = await addProducts(sql, vendorId, tag, 1);
    await addOrders(sql, buyer.id, vendorId, productId, tag, 27);

    await page.goto("/admin/orders?status=new");
    await expect(page.getByRole("link", { name: "Next" })).toBeVisible();
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/status=new.*page=2/);
    await expect(page.getByText(/Page 2 of \d+/)).toBeVisible();
  });
});
