"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ClockIcon, SearchIcon, StoreIcon } from "@/components/line-icons";
import { ProductImage } from "@/components/shop/product-image";
import { formatNaira } from "@/lib/pricing";
import { addRecentSearch, MIN_SEARCH_LENGTH, parseRecentSearches, RECENT_SEARCHES_KEY } from "@/lib/shop";

type ProductSuggestion = { id: string; title: string; priceKobo: number; unitLabel: string; photoId: string | null };
type Suggestions = { products: ProductSuggestion[]; categories: Array<{ value: string; label: string }>; popular: string[] };

type Option = { key: string; href: string; term: string | null; label: string; icon: ReactNode; meta?: string };
type Group = { title: string; options: Option[]; onClear?: () => void };

const EMPTY: Suggestions = { products: [], categories: [], popular: [] };

function readRecent(): string[] {
  try {
    return parseRecentSearches(window.localStorage.getItem(RECENT_SEARCHES_KEY));
  } catch {
    return [];
  }
}

function writeRecent(terms: string[]): void {
  try {
    window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(terms));
  } catch {
    return;
  }
}

function Highlight({ text, term }: { text: string; term: string }) {
  const index = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (index < 0) {
    return text;
  }
  return (
    <>
      {text.slice(0, index)}
      <span className="font-semibold text-navy">{text.slice(index, index + term.length)}</span>
      {text.slice(index + term.length)}
    </>
  );
}

export function SearchBox({ id, defaultValue = "", hidden = {}, className }: { id: string; defaultValue?: string; hidden?: Record<string, string>; className?: string }) {
  const router = useRouter();
  const [term, setTerm] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  const [results, setResults] = useState<Suggestions>(EMPTY);
  const cache = useRef(new Map<string, Suggestions>());
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const query = term.trim();
  const searching = query.length >= MIN_SEARCH_LENGTH;

  useEffect(() => {
    if (!open) {
      return;
    }
    const key = searching ? query.toLowerCase() : "";
    const known = cache.current.get(key);
    if (known) {
      setResults(known);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/shop/suggest?q=${encodeURIComponent(key)}`, { signal: controller.signal });
        if (response.ok) {
          const data = (await response.json()) as Suggestions;
          cache.current.set(key, data);
          setResults(data);
        }
      } catch {
        return;
      }
    }, searching ? 180 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, searching]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function searchHref(value: string): string {
    const params = new URLSearchParams({ ...hidden, q: value });
    return `/shop?${params.toString()}`;
  }

  function remember(value: string) {
    const next = addRecentSearch(readRecent(), value);
    writeRecent(next);
    setRecent(next);
  }

  function go(option: Option) {
    if (option.term) {
      remember(option.term);
      setTerm(option.term);
    }
    setOpen(false);
    setActive(-1);
    router.push(option.href);
  }

  const icon = (node: ReactNode) => <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sand text-navy/60">{node}</span>;
  const groups: Group[] = [];
  if (searching) {
    groups.push({
      title: "",
      options: [{ key: "search", href: searchHref(query), term: query, label: `Search for "${query}"`, icon: icon(<SearchIcon className="size-4" />) }],
    });
    if (results.products.length > 0) {
      groups.push({
        title: "Products",
        options: results.products.map((product) => ({
          key: `product-${product.id}`,
          href: `/shop/${product.id}`,
          term: null,
          label: product.title,
          meta: `${formatNaira(product.priceKobo)} per ${product.unitLabel}`,
          icon: <ProductImage photoId={product.photoId} alt="" sizes="36px" className="size-9 shrink-0 rounded-lg" />,
        })),
      });
    }
    if (results.categories.length > 0) {
      groups.push({
        title: "Categories",
        options: results.categories.map((category) => ({ key: `category-${category.value}`, href: `/shop?category=${category.value}`, term: null, label: category.label, icon: icon(<StoreIcon className="size-4" />) })),
      });
    }
  } else {
    if (recent.length > 0) {
      groups.push({
        title: "Recent searches",
        onClear: () => {
          writeRecent([]);
          setRecent([]);
        },
        options: recent.map((value) => ({ key: `recent-${value}`, href: searchHref(value), term: value, label: value, icon: icon(<ClockIcon className="size-4" />) })),
      });
    }
    if (results.popular.length > 0) {
      groups.push({
        title: "Popular",
        options: results.popular.map((value) => ({ key: `popular-${value}`, href: searchHref(value), term: value, label: value, icon: icon(<SearchIcon className="size-4" />) })),
      });
    }
  }

  const options = groups.flatMap((group) => group.options);
  const showList = open && options.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    if (!showList) {
      setOpen(true);
      return;
    }
    const step = event.key === "ArrowDown" ? 1 : -1;
    setActive((current) => {
      const next = current + step;
      if (next < -1) return options.length - 1;
      return next >= options.length ? -1 : next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = showList && active >= 0 ? options[active] : null;
    if (chosen) {
      go(chosen);
      return;
    }
    if (query) {
      remember(query);
    }
    setOpen(false);
    router.push(query ? searchHref(query) : "/shop");
  }

  let position = -1;

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <form action="/shop" method="get" role="search" onSubmit={onSubmit} className="grid grid-cols-[1fr_auto] gap-2 sm:gap-3">
        {Object.entries(hidden).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <label htmlFor={id} className="sr-only">
          Search products
        </label>
        <input
          id={id}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          enterKeyHint="search"
          value={term}
          placeholder="Search cement, rice, roofing sheets"
          onChange={(event) => {
            setTerm(event.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => {
            setRecent(readRecent());
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className="h-12 w-full min-w-0 rounded-xl border border-navy/20 bg-white px-4 text-[16px] text-navy placeholder:text-navy/50 focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy"
        />
        <button type="submit" className="h-12 rounded-xl bg-navy px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#13335c] sm:px-6">
          Search
        </button>
      </form>

      {showList && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-[min(440px,60svh)] lg:right-auto lg:w-full lg:max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-navy/10 bg-white p-2 text-left shadow-[0_24px_60px_rgba(11,37,69,0.18)]">
          <div id={listId} role="listbox" aria-label="Search suggestions">
            {groups.map((group) => (
              <div key={group.title || "search"} role="group" aria-label={group.title || "Search"} className="py-1 first:pt-0 last:pb-0">
                {group.title && (
                  <div className="flex items-center justify-between gap-3 px-2 pb-1 pt-2">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-navy/50">{group.title}</span>
                    {group.onClear && (
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={group.onClear}
                        className="text-[13px] font-semibold text-navy/60 transition-colors hover:text-navy"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
                {group.options.map((option) => {
                  position += 1;
                  const index = position;
                  return (
                    <div
                      key={option.key}
                      id={optionId(index)}
                      role="option"
                      aria-selected={index === active}
                      onMouseEnter={() => setActive(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => go(option)}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 ${index === active ? "bg-navy/[0.05]" : ""}`}
                    >
                      {option.icon}
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] text-navy/80">
                          <Highlight text={option.label} term={searching && option.key !== "search" ? query : ""} />
                        </span>
                        {option.meta && <span className="block truncate text-[13px] text-navy/60">{option.meta}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
