import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ArrowUpRightIcon } from "@/components/line-icons";
import { Section } from "@/components/section";
import { DeliverToPicker } from "@/components/shop/deliver-to-picker";
import { ProductCard } from "@/components/shop/product-card";
import { readDeliverTo } from "@/server/cart";
import { popularProducts, type CatalogRow } from "@/server/catalog";

async function ProductRow() {
  await connection();
  const deliverTo = await readDeliverTo();
  let rows: CatalogRow[];
  try {
    rows = await popularProducts(deliverTo);
  } catch (error) {
    console.error(error);
    rows = [];
  }
  const picker = (
    <div className="mt-5">
      <DeliverToPicker value={deliverTo} id="home-deliver-to" />
    </div>
  );
  if (rows.length === 0) {
    return (
      <>
        {picker}
        <p className="mt-6 rounded-2xl bg-white p-6 text-[15px] text-navy/70">
          {deliverTo ? `No sellers deliver to ${deliverTo} yet. Try another state or ` : "New goods are on the way. "}
          <Link href="/shop" className="font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
            visit the shop
          </Link>
          .
        </p>
      </>
    );
  }
  return (
    <>
      {picker}
      <ul className="-mx-[clamp(20px,3.2vw,56px)] mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[clamp(20px,3.2vw,56px)] pb-2 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0 lg:[&>li:nth-child(n+5)]:hidden">
        {rows.map((row) => (
          <li key={row.product.id} className="w-[72vw] max-w-[300px] shrink-0 snap-start lg:w-auto lg:max-w-none">
            <ProductCard row={row} deliverTo={deliverTo} />
          </li>
        ))}
      </ul>
    </>
  );
}

function RowSkeleton() {
  return (
    <div role="status" aria-live="polite" className="mt-6 grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-4">
      <span className="sr-only">Loading products</span>
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="h-[380px] rounded-2xl bg-navy/[0.07]" />
      ))}
    </div>
  );
}

export function PopularProducts() {
  return (
    <Section id="popular" tone="sand" labelledBy="popular-title" className="!py-[clamp(40px,5vw,72px)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div>
          <h2 id="popular-title" className="font-display text-[clamp(36px,4vw,64px)] uppercase leading-[0.95] text-navy">
            Popular <span className="text-orange-deep">right now</span>
          </h2>
          <p className="mt-2 text-[16px] text-navy/70">Bulk goods from verified sellers, delivered on their own trucks.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <form action="/shop" method="get" role="search" className="flex gap-2">
            <label htmlFor="home-search" className="sr-only">
              Search products
            </label>
            <input
              id="home-search"
              name="q"
              type="search"
              placeholder="Search cement, rice, roofing"
              className="h-12 w-full min-w-0 rounded-xl border border-navy/20 bg-white px-4 text-[16px] text-navy placeholder:text-navy/50 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy sm:w-72"
            />
            <button type="submit" className="h-12 shrink-0 rounded-xl bg-navy px-5 text-[15px] font-semibold text-white transition-colors hover:bg-[#13335c]">
              Search
            </button>
          </form>
          <Link href="/shop" className="inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
            See all
            <ArrowUpRightIcon className="size-4" />
          </Link>
        </div>
      </div>
      <Suspense fallback={<RowSkeleton />}>
        <ProductRow />
      </Suspense>
    </Section>
  );
}
