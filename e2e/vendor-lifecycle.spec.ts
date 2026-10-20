import path from "node:path";
import type { Page } from "@playwright/test";
import { createSessionFor, expect, test } from "./support/fixtures";

const PDF = path.join(__dirname, "fixtures", "document.pdf");
const PNG = path.join(__dirname, "fixtures", "truck.png");
const TEXT = path.join(__dirname, "fixtures", "not-a-document.txt");

function futureDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function registration(): string {
  return `KJA-${Math.floor(100 + Math.random() * 900)}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`;
}

function section(page: Page, heading: string) {
  return page.locator("li").filter({ has: page.getByRole("heading", { name: heading, exact: true }) });
}

async function completeVendorProfile(page: Page) {
  await page.goto("/vendor/profile");
  await page.getByLabel("Registered logistics company").check();
  await page.getByLabel("Full legal name").fill("Amaka Nwosu");
  await page.getByLabel("Business name").fill("Nwosu Freight Ltd");
  await page.getByLabel("Business email").fill(`ops.${Date.now()}@nwosufreight.ng`);
  await page.getByLabel("CAC registration number").fill(`RC ${Math.floor(1_000_000 + Math.random() * 8_999_999)}`);
  await page.getByLabel("Business address").fill("4 Creek Road");
  await page.getByLabel("Town or city").fill("Apapa");
  await page.getByRole("combobox", { name: "State", exact: true }).selectOption("Lagos");
  await page.getByRole("checkbox", { name: "Lagos" }).check();
  await page.getByRole("checkbox", { name: "Kano" }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/vendor\/verification$/);
}

async function uploadIn(page: Page, heading: string, file: string) {
  const item = section(page, heading);
  await item.locator('input[type="file"]').setInputFiles(file);
  await item.getByRole("button", { name: "Upload", exact: true }).click();
}

async function createTruck(page: Page, registrationNumber: string) {
  await page.goto("/vendor/trucks/new");
  await page.getByLabel("Registration number").fill(registrationNumber);
  await page.getByLabel("Make").fill("MAN");
  await page.getByLabel("Model").fill("TGS 26.440");
  await page.getByLabel("Year").fill("2019");
  await page.getByLabel("Truck category").selectOption("heavy_duty");
  await page.getByLabel("Cargo body type").selectOption("enclosed");
  await page.getByLabel("Maximum permitted payload (kg)").fill("20000");
  await page.getByLabel("Number of tyres").fill("10");
  await page.getByRole("checkbox", { name: "General goods" }).check();
  await page.getByRole("checkbox", { name: "Machinery and equipment" }).check();
  await page.getByRole("button", { name: "Save and continue" }).click();
}

test.describe("vendor lifecycle", () => {
  test.skip(({ isMobile }) => isMobile, "covered on desktop");

  test("vendor is verified and a truck is approved by an administrator", async ({ browser, page, sql, signInAs, createUser }) => {
    test.slow();
    await signInAs("vendor", { fullName: "Amaka Nwosu" });
    await completeVendorProfile(page);

    await page.getByLabel("ID type").selectOption("nin");
    await page.getByLabel("ID number").fill("12345678901");
    await page.getByRole("button", { name: "Save identity details" }).click();
    await expect(page.getByText("Identity details saved securely.")).toBeVisible();

    await uploadIn(page, "Government-issued ID", TEXT);
    await expect(section(page, "Government-issued ID").getByText("Upload a PDF, JPG, PNG or WebP file.").first()).toBeVisible();
    await uploadIn(page, "Government-issued ID", PDF);
    await expect(section(page, "Government-issued ID").getByText("Pending review")).toBeVisible();
    await uploadIn(page, "CAC certificate", PDF);
    await expect(section(page, "CAC certificate").getByText("Pending review")).toBeVisible();

    await page.getByRole("button", { name: "Submit for verification" }).click();
    await expect(page.getByText("Submitted for verification", { exact: true })).toBeVisible();
    await expect(page.getByLabel("ID number")).toBeDisabled();

    await createTruck(page, "ABCDEF");
    await expect(page.getByText("Enter a valid registration number", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Make")).toHaveValue("MAN");
    await expect(page.getByLabel("Truck category")).toHaveValue("heavy_duty");
    await expect(page.getByLabel("Cargo body type")).toHaveValue("enclosed");
    await expect(page.getByRole("checkbox", { name: "Machinery and equipment" })).toBeChecked();

    const plate = registration();
    await page.getByLabel("Registration number").fill(plate);
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/\/vendor\/trucks\/[0-9a-f-]{36}$/);
    const truckId = page.url().split("/").pop() ?? "";
    const [stored] = await sql<{ category: string; body_type: string; cargo_types: string[] }[]>`select category, body_type, cargo_types from trucks where id = ${truckId}`;
    expect(stored).toEqual({ category: "heavy_duty", body_type: "enclosed", cargo_types: ["general_goods", "machinery"] });

    await uploadIn(page, "Vehicle registration", PDF);
    await expect(section(page, "Vehicle registration").getByText("Pending review")).toBeVisible();
    await uploadIn(page, "Proof of ownership or lease", PDF);
    await expect(section(page, "Proof of ownership or lease").getByText("Pending review")).toBeVisible();

    const roadworthiness = section(page, "Roadworthiness certificate");
    await roadworthiness.getByLabel("Expiry date").fill(futureDate(-3));
    await uploadIn(page, "Roadworthiness certificate", PDF);
    await expect(roadworthiness.getByText("This document has expired. Upload a current one.")).toBeVisible();
    await roadworthiness.getByLabel("Expiry date").fill(futureDate(200));
    await uploadIn(page, "Roadworthiness certificate", PDF);
    await expect(roadworthiness.getByText("Pending review")).toBeVisible();

    const insurance = section(page, "Insurance certificate");
    await insurance.getByLabel("Expiry date").fill(futureDate(365));
    await uploadIn(page, "Insurance certificate", PDF);
    await expect(insurance.getByText("Pending review")).toBeVisible();

    for (let index = 1; index <= 2; index += 1) {
      await page.getByLabel("Add a truck photo").setInputFiles(PNG);
      await page.getByRole("button", { name: "Add photo" }).click();
      await expect(page.getByRole("img", { name: `Photo ${index} of ${plate}` })).toBeVisible();
    }

    await page.getByRole("button", { name: "Submit truck for review" }).click();
    await expect(page.getByText("Under review")).toBeVisible();

    const admin = await createUser("admin", "Ops Admin");
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await createSessionFor(sql, adminPage, admin.id);

    await adminPage.goto(`/admin/trucks/${truckId}`);
    await expect(adminPage.getByText("Vendor not verified")).toBeVisible();
    await adminPage.getByRole("button", { name: "Approve truck" }).click();
    await expect(adminPage.getByText("Verify the vendor before approving their trucks.")).toBeVisible();

    await adminPage.getByRole("link", { name: "Nwosu Freight Ltd" }).click();
    await expect(adminPage.getByRole("heading", { level: 1 })).toHaveText("Nwosu Freight Ltd");
    await adminPage.getByRole("button", { name: "Reveal (logged)" }).click();
    await expect(adminPage.getByText("12345678901")).toBeVisible();
    await adminPage.getByRole("button", { name: "Decline" }).click();
    await expect(adminPage.getByText(/at least 10 characters/).first()).toBeVisible();
    await adminPage.getByRole("button", { name: "Verify vendor" }).click();
    await expect(adminPage.locator("header").getByText("Verified", { exact: true })).toBeVisible();
    await expect(adminPage.getByText("Vendor verified", { exact: true })).toBeVisible();

    await adminPage.goto(`/admin/trucks/${truckId}`);
    await adminPage.getByRole("button", { name: "Approve truck" }).click();
    await expect(adminPage.getByText("Truck approved and active.")).toBeVisible();

    await adminPage.goto("/admin/audit");
    await expect(adminPage.getByRole("cell", { name: "Truck approved" }).first()).toBeVisible();
    await expect(adminPage.getByRole("cell", { name: "Vendor id reference viewed" }).first()).toBeVisible();
    await adminContext.close();

    await page.reload();
    await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
    await page.getByRole("button", { name: "Mark unavailable" }).click();
    await expect(page.getByRole("button", { name: "Mark available" })).toBeVisible();

    await page.goto("/vendor/verification");
    await expect(page.getByText("Verified vendor")).toBeVisible();
  });

  test("admin can request changes and the vendor resubmits", async ({ browser, page, sql, signInAs, createUser }) => {
    test.slow();
    await signInAs("vendor", { fullName: "Musa Bello" });
    await completeVendorProfile(page);
    await page.getByLabel("ID type").selectOption("drivers_licence");
    await page.getByLabel("ID number").fill("ABC12345XY");
    await page.getByRole("button", { name: "Save identity details" }).click();
    await expect(page.getByText("Identity details saved securely.")).toBeVisible();
    await uploadIn(page, "Government-issued ID", PNG);
    await expect(section(page, "Government-issued ID").getByText("Pending review")).toBeVisible();
    await uploadIn(page, "CAC certificate", PDF);
    await expect(section(page, "CAC certificate").getByText("Pending review")).toBeVisible();
    await page.getByRole("button", { name: "Submit for verification" }).click();
    await expect(page.getByText("Submitted for verification", { exact: true })).toBeVisible();

    const [vendor] = await sql<{ id: string }[]>`select vendor_profiles.id from vendor_profiles join users on users.id = vendor_profiles.user_id where users.full_name = 'Musa Bello' order by vendor_profiles.created_at desc limit 1`;

    const admin = await createUser("admin");
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await createSessionFor(sql, adminPage, admin.id);
    await adminPage.goto(`/admin/vendors/${vendor.id}`);
    await adminPage.getByLabel("Note to the vendor").fill("The CAC certificate is cropped. Upload the full certificate.");
    await adminPage.getByRole("button", { name: "Request information" }).click();
    await expect(adminPage.locator("header").getByText("Information required", { exact: true })).toBeVisible();
    await expect(adminPage.getByText("The CAC certificate is cropped.", { exact: false }).first()).toBeVisible();
    await adminContext.close();

    await page.reload();
    await expect(page.getByText("More information needed")).toBeVisible();
    await expect(page.getByText("The CAC certificate is cropped.", { exact: false })).toBeVisible();
    await expect(page.getByLabel("ID number")).toBeEnabled();
    await uploadIn(page, "CAC certificate", PDF);
    await page.getByRole("button", { name: "Submit for verification" }).click();
    await expect(page.getByText("Submitted for verification", { exact: true })).toBeVisible();
  });
});

test.describe("data protection", () => {
  test("vendors cannot open other vendors' documents, administrators can", async ({ browser, page, sql, signInAs, createUser }) => {
    test.slow();
    await signInAs("vendor", { fullName: "Owner One" });
    await completeVendorProfile(page);
    await uploadIn(page, "Government-issued ID", PDF);
    await expect(section(page, "Government-issued ID").getByText("Pending review")).toBeVisible();
    const href = await section(page, "Government-issued ID").getByRole("link", { name: "document.pdf" }).getAttribute("href");
    expect(href).toMatch(/^\/files\/vendor-documents\/[0-9a-f-]{36}$/);

    const ownResponse = await page.request.get(href ?? "", { maxRedirects: 0 });
    expect(ownResponse.status()).toBe(303);

    const other = await createUser("vendor", "Owner Two");
    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await createSessionFor(sql, otherPage, other.id);
    const otherResponse = await otherPage.request.get(href ?? "", { maxRedirects: 0 });
    expect(otherResponse.status()).toBe(404);
    await otherContext.close();

    const anonymous = await browser.newContext();
    const anonymousResponse = await anonymous.request.get(`${test.info().project.use.baseURL}${href}`, { maxRedirects: 0 });
    expect(anonymousResponse.status()).toBe(401);
    await anonymous.close();

    const admin = await createUser("admin");
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await createSessionFor(sql, adminPage, admin.id);
    const adminResponse = await adminPage.request.get(href ?? "", { maxRedirects: 0 });
    expect(adminResponse.status()).toBe(303);
    expect(adminResponse.headers().location).toContain("X-Amz-Signature");
    await adminContext.close();
  });

  test("a registration number can only be listed once", async ({ browser, page, sql, signInAs, createUser }) => {
    test.slow();
    const plate = registration();
    await signInAs("vendor", { fullName: "First Owner" });
    await completeVendorProfile(page);
    await createTruck(page, plate);
    await expect(page).toHaveURL(/\/vendor\/trucks\/[0-9a-f-]{36}$/);

    const second = await createUser("vendor", "Second Owner");
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();
    await createSessionFor(sql, secondPage, second.id);
    await completeVendorProfile(secondPage);
    await createTruck(secondPage, plate.toLowerCase().replace("-", " "));
    await expect(secondPage.getByText("This registration number is already listed.", { exact: false })).toBeVisible();
    await secondContext.close();
  });
});
