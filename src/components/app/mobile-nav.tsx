"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { isActive, NAV_ICONS, type NavItem } from "@/components/app/nav-links";
import { CloseIcon, MenuIcon } from "@/components/line-icons";

export function MobileNav({ items, footer }: { items: readonly NavItem[]; footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const sheetId = useId();
  const tabs = items.filter((item) => item.primary);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      root.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <nav
        aria-label="Dashboard"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
      >
        <ul className="mx-auto grid max-w-[560px]" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
          {tabs.map((item) => {
            const active = isActive(item, pathname);
            const Icon = NAV_ICONS[item.icon];
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${active ? "text-white" : "text-white/60"}`}
                >
                  <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${active ? "bg-orange text-navy" : ""}`}>
                    <Icon className="size-5" />
                  </span>
                  <span className="max-w-full truncate px-1">{item.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={sheetId}
              onClick={() => setOpen(true)}
              className={`flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${open ? "text-white" : "text-white/60"}`}
            >
              <span className="grid h-7 w-12 place-items-center rounded-full">
                <MenuIcon className="size-5" />
              </span>
              Menu
            </button>
          </li>
        </ul>
      </nav>

      <div id={sheetId} hidden={!open} className="fixed inset-0 z-50 lg:hidden">
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => setOpen(false)} className="absolute inset-0 bg-navy/55 backdrop-blur-[2px]" />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="All pages"
          className="absolute inset-x-0 bottom-0 max-h-[88svh] overflow-y-auto overscroll-contain rounded-t-3xl bg-sand px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 text-navy shadow-[0_-24px_60px_rgba(5,14,28,0.35)]"
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-navy/20" aria-hidden="true" />
          <div className="mt-4 flex items-center justify-between">
            <p className="font-display text-[28px] uppercase leading-none">Menu</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="grid size-11 place-items-center rounded-full bg-white text-navy shadow-[0_2px_8px_rgba(11,37,69,0.08)]"
            >
              <CloseIcon className="size-5" />
            </button>
          </div>
          <ul className="mt-5 grid grid-cols-2 gap-2">
            {items.map((item) => {
              const active = isActive(item, pathname);
              const Icon = NAV_ICONS[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex h-14 items-center gap-3 rounded-2xl px-4 text-[15px] font-semibold transition-colors ${
                      active ? "bg-navy text-white" : "bg-white text-navy hover:bg-white/70"
                    }`}
                  >
                    <Icon className={`size-5 shrink-0 ${active ? "text-orange" : "text-orange-ink"}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 rounded-2xl bg-navy p-4">{footer}</div>
        </div>
      </div>
    </>
  );
}
