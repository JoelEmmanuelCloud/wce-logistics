"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { WceLogo } from "@/components/wce-logo";

type MenuItem = { title: string; detail: string; href?: string };
type Menu = { label: string; items: MenuItem[] };

function buildMenus(contactEmail: string): Menu[] {
  return [
    {
      label: "Services",
      items: [
        { title: "Truck freight", detail: "Shared or dedicated loads from 50 kg between states" },
        { title: "Heavy equipment haulage", detail: "Flatbeds and low-loaders for plant and machinery" },
        { title: "Bus charter", detail: "Buses for staff, crews and group movement" },
        { title: "On-demand logistics", detail: "Book verified capacity when you need it" },
      ],
    },
    {
      label: "Industries",
      items: [
        { title: "Construction", detail: "Materials, plant and site equipment" },
        { title: "Agriculture", detail: "Produce and inputs from farm to market" },
        { title: "Manufacturing", detail: "Raw materials in, finished goods out" },
        { title: "Retail and distribution", detail: "Stock moved between warehouses and stores" },
      ],
    },
    {
      label: "Company",
      items: [
        { title: "About WCE Logistics", detail: "A marketplace connecting shippers with verified truck vendors" },
        { title: "Become a vendor", detail: "Truck owners and fleet operators list verified trucks and routes" },
        { title: "Contact us", detail: contactEmail, href: `mailto:${contactEmail}` },
      ],
    },
  ];
}

function MenuPanel({ items }: { items: MenuItem[] }) {
  return (
    <ul className="grid gap-1">
      {items.map((item) => {
        const body = (
          <>
            <span className="block text-[15px] font-semibold text-navy">{item.title}</span>
            <span className="block text-[13px] leading-snug text-navy/65">{item.detail}</span>
          </>
        );
        return (
          <li key={item.title}>
            {item.href ? (
              <a href={item.href} className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-navy/5 focus-visible:bg-navy/5 focus-visible:outline-none">
                {body}
              </a>
            ) : (
              <div className="rounded-xl px-3 py-2.5">{body}</div>
            )}
          </li>
        );
      })}
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

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
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
    <header ref={navRef} className="relative z-30 flex items-start justify-between gap-6">
      <Link href="/" aria-label="WCE Logistics home" className="text-[clamp(15px,1.45vw,22px)]">
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
                  <MenuPanel items={menu.items} />
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <button
        type="button"
        aria-expanded={mobileOpen}
        aria-controls={`${baseId}-mobile`}
        onClick={() => setMobileOpen((value) => !value)}
        className="flex h-10 items-center gap-2 rounded-full border border-white/40 px-4 text-sm font-medium text-white md:hidden"
      >
        {mobileOpen ? "Close" : "Menu"}
      </button>
      <div
        id={`${baseId}-mobile`}
        hidden={!mobileOpen}
        className="absolute inset-x-0 top-full mt-3 max-h-[75svh] overflow-y-auto rounded-2xl bg-white p-3 shadow-[0_24px_60px_rgba(11,37,69,0.35)] md:hidden"
      >
        {menus.map((menu) => (
          <section key={menu.label} className="border-b border-navy/10 py-2 last:border-b-0">
            <h2 className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.14em] text-orange">{menu.label}</h2>
            <MenuPanel items={menu.items} />
          </section>
        ))}
      </div>
    </header>
  );
}
