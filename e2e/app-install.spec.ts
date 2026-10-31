import { expect, test } from "./support/fixtures";

test.describe("installable app", () => {
  test("the manifest and icons make the site installable", async ({ request }) => {
    const response = await request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);
    const manifest = await response.json();
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === "maskable")).toBe(true);
    for (const icon of manifest.icons as Array<{ src: string }>) {
      const file = await request.get(icon.src);
      expect(file.ok()).toBe(true);
      expect(file.headers()["content-type"]).toBe("image/png");
    }
  });

  test("the service worker is served fresh and an offline page exists", async ({ request }) => {
    const worker = await request.get("/sw.js");
    expect(worker.ok()).toBe(true);
    expect(worker.headers()["content-type"]).toContain("javascript");
    expect(worker.headers()["cache-control"]).toContain("no-cache");
    const offline = await request.get("/offline.html");
    expect(await offline.text()).toContain("You are offline");
  });

  test("going offline shows the offline page, not a browser error", async ({ page, context }, info) => {
    test.skip(info.project.name !== "desktop", "one browser is enough");
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    const [worker] = context.serviceWorkers();
    await worker.evaluate(() => {
      globalThis.fetch = () => Promise.reject(new TypeError("offline"));
    });
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "You are offline" })).toBeVisible();
  });

  test("the worker never stores pages or account data", async ({ page, context }, info) => {
    test.skip(info.project.name !== "desktop", "one browser is enough");
    await page.goto("/");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.goto("/shop");
    const stored = await page.evaluate(async () => {
      const cache = await caches.open("wce-static-v1");
      return (await cache.keys()).map((entry) => new URL(entry.url).pathname);
    });
    expect(context.serviceWorkers()).toHaveLength(1);
    expect(stored.length).toBeGreaterThan(0);
    for (const path of stored) {
      expect(path === "/offline.html" || path.startsWith("/_next/static/") || path.startsWith("/icons/")).toBe(true);
    }
  });
});

test.describe("cookie notice", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("shows once, links to the policy and stays dismissed", async ({ page }) => {
    await page.goto("/");
    const notice = page.getByRole("complementary", { name: "Cookie notice" });
    await expect(notice).toBeVisible();
    await expect(notice).toContainText("No tracking");

    await notice.getByRole("link", { name: "Cookie policy" }).click();
    await expect(page).toHaveURL(/\/cookies$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cookie policy");

    await page.getByRole("complementary", { name: "Cookie notice" }).getByRole("button", { name: "OK" }).click();
    await expect(page.getByRole("complementary", { name: "Cookie notice" })).toHaveCount(0);

    await page.reload();
    await page.waitForTimeout(1800);
    await expect(page.getByRole("complementary", { name: "Cookie notice" })).toHaveCount(0);
  });
});
