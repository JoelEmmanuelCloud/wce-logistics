"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { WceLogo } from "@/components/wce-logo";
import { INDUSTRIES, SERVICES } from "@/data/landing";

type MenuItem = { title: string; detail: string; href: string };
type Menu = { label: string; items: MenuItem[] };

function buildMenus(contactEmail: string): Menu[] {
  return [
    {
      label: "Services",
      items: SERVICES.map((service) => ({ title: service.title, detail: service.summary, href: "#services" })),
    },
    {
      label: "Industries",
      items: INDUSTRIES.map((industry) => ({ title: industry.title, detail: industry.summary, href: "#industries" })),
    },
    {
      label: "Company",
      items: [
        { title: "How it works", detail: "From booking request to proof of delivery", href: "#how-it-works" },
        { title: "Pricing", detail: "Per-kilogram rates with every charge itemised", href: "#pricing" },
        { title: "Become a vendor", detail: "Truck owners and fleet operators list verified trucks and routes", href: "#vendors" },
        { title: "Contact us", detail: contactEmail, href: `mailto:${contactEmail}` },
      ],
    },
  ];
}

function MenuPanel({ items, onNavigate }: { items: MenuItem[]; onNavigate: () => void }) {
  return (
    <ul className="grid gap-1">
      {items.map((item) => (
        <li key={item.title}>
          <a
            href={item.href}
            onClick={onNavigate}
            className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-navy/5 focus-visible:bg-navy/5 focus-visible:outline-none"
          >
            <span className="block text-[15px] font-semibold text-navy">{item.title}</span>
            <span className="block text-[13px] leading-snug text-navy/65">{item.detail}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true">
      <path d="M3.5 6L8 10.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SiteHeader({ contactEmail }: { contactEmail: string }) {
  const menus = buildMenus(contactEmail);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const baseId = useId();

  function closeMenus() {
    setOpenMenu(null);
    setMobileOpen(false);
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        closeMenus();
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <header ref={navRef} className="relative z-30 flex items-center justify-between gap-3 md:items-start md:gap-6">
      <Link href="/" aria-label="WCE Logistics home" className="shrink-0 text-[clamp(14px,1.45vw,22px)]">
        <WceLogo />
      </Link>

      <nav aria-label="Main" className="hidden md:block">
        <ul className="flex items-center gap-[clamp(20px,4vw,64px)]">
          {menus.map((menu) => {
            const open = openMenu === menu.label;
            const panelId = `${baseId}-${menu.label}`;
            return (
              <li key={menu.label} className="relative">
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenMenu(open ? null : menu.label)}
                  className="flex items-center gap-2 py-1 text-[clamp(15px,1.15vw,18px)] text-white/95 transition-colors hover:text-white"
                >
                  {menu.label}
                  <Chevron open={open} />
                </button>
                <div
                  id={panelId}
                  hidden={!open}
                  className="absolute right-0 top-full mt-3 w-80 rounded-2xl bg-white p-2 shadow-[0_24px_60px_rgba(11,37,69,0.28)]"
                >
                  <MenuPanel items={menu.items} onNavigate={closeMenus} />
                </div>
              </li>
            );
          })}
          <li>
            <Link
              href="/sign-in"
              className="inline-flex h-10 items-center rounded-full border border-white/50 px-5 text-[clamp(14px,1.05vw,16px)] font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-navy"
            >
              Sign in
            </Link>
          </li>
        </ul>
      </nav>

      <div className="flex items-center gap-2 md:hidden">
        <Link href="/sign-in" className="flex h-10 items-center whitespace-nowrap rounded-full bg-white px-3.5 text-sm font-semibold text-navy">
          Sign in
        </Link>
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls={`${baseId}-mobile`}
          onClick={() => setMobileOpen((value) => !value)}
          className="flex h-10 items-center gap-2 whitespace-nowrap rounded-full border border-white/40 px-3.5 text-sm font-medium text-white"
        >
          {mobileOpen ? "Close" : "Menu"}
        </button>
      </div>
      <div
        id={`${baseId}-mobile`}
        hidden={!mobileOpen}
        className="absolute inset-x-0 top-full mt-3 max-h-[75svh] overflow-y-auto rounded-2xl bg-white p-3 shadow-[0_24px_60px_rgba(11,37,69,0.35)] md:hidden"
      >
        {menus.map((menu) => (
          <section key={menu.label} className="border-b border-navy/10 py-2 last:border-b-0">
            <h2 className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-orange-ink">{menu.label}</h2>
            <MenuPanel items={menu.items} onNavigate={closeMenus} />
          </section>
        ))}
      </div>
    </header>
  );
}
