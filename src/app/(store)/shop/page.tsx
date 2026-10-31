import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { DeliverToPicker } from "@/components/shop/deliver-to-picker";
import { ProductCard } from "@/components/shop/product-card";
import { SearchBox } from "@/components/shop/search-box";
import { parsePage } from "@/server/admin";
import { readDeliverTo } from "@/server/cart";
import { catalogCategories, listCatalog } from "@/server/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Buy cement, building materials, farm produce and more from verified sellers. Delivered by their own trucks across Nigeria.",
  alternates: { canonical: "/shop" },
};

type Params = PageProps<"/shop">["searchParams"];

const text = (value: string | string[] | undefined) => (typeof value === "string" ? value.trim().slice(0, 80) : "");

function hrefWith(params: Record<string, string>): string {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value));
  const suffix = query.toString();
  return suffix ? `/shop?${suffix}` : "/shop";
}

function chipClass(active: boolean): string {
  return `whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${active ? "bg-navy text-white" : "bg-white text-navy hover:bg-navy/5"}`;
}

async function Catalog({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const deliverTo = await readDeliverTo();
  const filter = { query: text(params.q), category: text(params.category), state: deliverTo, sellerId: /^[0-9a-f-]{36}$/i.test(text(params.seller)) ? text(params.seller) : "" };
  const [catalog, categories] = await Promise.all([listCatalog({ ...filter, page: parsePage(params.page) }), catalogCategories()]);
  const page = catalog.page;
  const keep = { q: filter.query, seller: filter.sellerId };
  const current = { ...keep, category: filter.category };

  return (
    <>
      <SearchBox
        id="shop-search"
        defaultValue={filter.query}
        hidden={Object.fromEntries(Object.entries({ category: filter.category, seller: filter.sellerId }).filter(([, value]) => value))}
      />

      <div className="mt-3">
        <DeliverToPicker value={deliverTo} id="shop-deliver-to" />
      </div>

      {categories.length > 0 && (
        <nav aria-label="Categories" className="-mx-1 mt-4 flex gap-2 overflow-x-auto pb-1 max-md:pr-12 max-md:[mask-image:linear-gradient(to_right,#000_calc(100%-48px),transparent)]">
          <Link href={hrefWith(keep)} aria-current={!filter.category ? "page" : undefined} className={chipClass(!filter.category)}>
            All
          </Link>
          {categories.map((category) => (
            <Link key={category.value} href={hrefWith({ ...keep, category: category.value })} aria-current={filter.category === category.value ? "page" : undefined} className={chipClass(filter.category === category.value)}>
              {category.label}
            </Link>
          ))}
        </nav>
      )}

      {catalog.rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-navy/20 bg-white px-6 py-14 text-center">
          <h2 className="font-display text-[28px] uppercase leading-none text-navy">Nothing found</h2>
          <p className="mx-auto mt-3 max-w-[30em] text-[15px] leading-relaxed text-navy/70">Try a different search, or clear your filters to see everything on sale.</p>
          <Link href="/shop" className="mt-5 inline-block font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
            Clear filters
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-[14px] text-navy/70">
            {catalog.total.toLocaleString("en-NG")} product{catalog.total === 1 ? "" : "s"}
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4 2xl:grid-cols-5">
            {catalog.rows.map((row) => (
              <li key={row.product.id}>
                <ProductCard row={row} deliverTo={deliverTo} />
              </li>
            ))}
          </ul>
          {catalog.pageCount > 1 && (
            <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-4 text-[14px] text-navy/70">
              <p>
                Page {page} of {catalog.pageCount}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={hrefWith({ ...current, page: String(page - 1) })} className={chipClass(false)}>
                    Previous
                  </Link>
                )}
                {page < catalog.pageCount && (
                  <Link href={hrefWith({ ...current, page: String(page + 1) })} className={chipClass(false)}>
                    Next
                  </Link>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </>
  );
}

function CatalogSkeleton() {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading products</span>
      <div className="h-12 rounded-xl bg-navy/[0.07]" />
      <div className="mt-8 grid gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="h-72 rounded-2xl bg-navy/[0.07]" />
        ))}
      </div>
    </div>
  );
}

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <>
      <header className="mb-4 sm:mb-6">
        <h1 className="font-display text-[clamp(32px,5vw,72px)] uppercase leading-[0.92] text-navy">
          Buy it. <span className="text-orange-deep">They haul it.</span>
        </h1>
        <p className="mt-3 hidden max-w-[40em] text-[clamp(16px,1.2vw,19px)] leading-relaxed text-navy/70 sm:block">
          Bulk goods from verified sellers, delivered on their own checked trucks and tracked to your door.
        </p>
      </header>
      <Suspense fallback={<CatalogSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </>
  );
}
