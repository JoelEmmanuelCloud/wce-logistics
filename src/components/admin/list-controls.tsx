import Link from "next/link";
import type { ReactNode } from "react";

function hrefWith(base: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "" && !(key === "page" && value === 1)) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `${base}?${query}` : base;
}

export function FilterTabs({
  base,
  filters,
  active,
  query,
  param = "status",
}: {
  base: string;
  filters: Record<string, { label: string }>;
  active: string;
  query: string;
  param?: string;
}) {
  return (
    <nav aria-label="Filter" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
      {Object.entries(filters).map(([key, filter]) => (
        <Link
          key={key}
          href={hrefWith(base, { [param]: key, q: query })}
          aria-current={key === active ? "page" : undefined}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${
            key === active ? "bg-navy text-white" : "text-navy/70 hover:bg-navy/5 hover:text-navy"
          }`}
        >
          {filter.label}
        </Link>
      ))}
    </nav>
  );
}

export function SearchForm({ base, status, query, placeholder }: { base: string; status: string; query: string; placeholder: string }) {
  return (
    <form action={base} method="get" role="search" className="flex gap-2">
      <input type="hidden" name="status" value={status} />
      <label htmlFor="admin-search" className="sr-only">
        Search
      </label>
      <input
        id="admin-search"
        name="q"
        type="search"
        defaultValue={query}
        placeholder={placeholder}
        className="h-11 w-full min-w-0 rounded-full border border-navy/20 bg-white px-4 text-[15px] text-navy placeholder:text-navy/70 focus:border-orange-ink focus:outline-none focus:ring-3 focus:ring-orange/25 sm:w-72"
      />
      <button type="submit" className="h-11 rounded-full bg-navy px-5 text-[14px] font-semibold text-white hover:bg-[#13335c]">
        Search
      </button>
    </form>
  );
}

export function Pagination({
  base,
  page,
  pageCount,
  total,
  params,
}: {
  base: string;
  page: number;
  pageCount: number;
  total: number;
  params: Record<string, string>;
}) {
  if (pageCount <= 1) {
    return <p className="mt-4 text-[13px] text-navy/70">{total} result{total === 1 ? "" : "s"}</p>;
  }
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between gap-4 text-[14px]">
      <p className="text-navy/70">
        Page {page} of {pageCount}, {total} results
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={hrefWith(base, { ...params, page: page - 1 })} className="rounded-full border border-navy/20 px-4 py-2 font-semibold text-navy hover:border-navy/40">
            Previous
          </Link>
        )}
        {page < pageCount && (
          <Link href={hrefWith(base, { ...params, page: page + 1 })} className="rounded-full border border-navy/20 px-4 py-2 font-semibold text-navy hover:border-navy/40">
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}

export function DataTable({ headers, children, caption }: { headers: readonly string[]; children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-[20px] border border-navy/10 bg-white">
      <table className="w-full min-w-[720px] border-collapse text-left text-[14px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-navy/10 bg-navy/[0.03]">
            {headers.map((header) => (
              <th key={header} scope="col" className="px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-navy/70">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy/10">{children}</tbody>
      </table>
    </div>
  );
}
