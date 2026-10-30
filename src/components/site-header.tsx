"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowUpRightIcon, CloseIcon, MailIcon, MenuIcon, WhatsAppIcon } from "@/components/line-icons";
import { WceLogo } from "@/components/wce-logo";
import { IMAGES, type SiteImage } from "@/data/images";
import { INDUSTRIES, SERVICES } from "@/data/landing";

type Feature = { title: string; detail: string; href: string; image: SiteImage };
type QuickLink = { title: string; href: string };
type Menu = { label: string; intro: string; features: Feature[]; linksTitle: string; links: QuickLink[] };

function buildMenus(contactEmail: string, whatsappUrl: string): Menu[] {
  return [
    {
      label: "Services",
      intro: "What we move",
      features: SERVICES.map((service) => ({
        title: service.title,
        detail: service.summary,
        href: "#services",
        image: IMAGES[service.key],
      })),
      linksTitle: "Plan a shipment",
      links: [
        { title: "Check a price", href: "#estimate" },
        { title: "How booking works", href: "#how-it-works" },
        { title: "Common questions", href: "#faq" },
        { title: "Book a truck", href: "/sign-in?as=customer" },
      ],
    },
    {
      label: "Industries",
      intro: "Who we move for",
      features: INDUSTRIES.map((industry) => ({
        title: industry.title,
        detail: industry.summary,
        href: "#industries",
        image: IMAGES[industry.key],
      })),
      linksTitle: "Why businesses choose us",
      links: [
        { title: "Verified vendors and trucks", href: "#trust" },
        { title: "Tracked from pickup to delivery", href: "#how-it-works" },
        { title: "Every charge itemised", href: "#pricing" },
        { title: "Talk to our team", href: `mailto:${contactEmail}` },
      ],
    },
    {
      label: "Company",
      intro: "About WCE Logistics",
      features: [
        { title: "How it works", detail: "From booking request to proof of delivery", href: "#how-it-works", image: IMAGES.onDemand },
        { title: "Verification", detail: "Every vendor and truck checked before it takes a load", href: "#trust", image: IMAGES.inspection },
        { title: "Pricing", detail: "Rates per tonne with every charge itemised", href: "#pricing", image: IMAGES.warehouse },
        { title: "Become a vendor", detail: "Truck owners and fleet operators list verified trucks and routes", href: "#vendors", image: IMAGES.vendor },
      ],
      linksTitle: "Get in touch",
      links: [
        { title: "Chat on WhatsApp", href: whatsappUrl },
        { title: contactEmail, href: `mailto:${contactEmail}` },
        { title: "Questions and answers", href: "#faq" },
      ],
    },
  ];
}

function MenuLink({ href, onClick, className, children, ...events }: {
  href: string;
  onClick: () => void;
  className: string;
  children: ReactNode;
  onMouseEnter?: () => void;
  onFocus?: () => void;
}) {
  if (href.startsWith("/")) {
    return (
      <Link href={href} onClick={onClick} className={className} {...events}>
        {children}
      </Link>
    );
  }
  const external = href.startsWith("https://");
  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      {...events}
    >
      {children}
    </a>
  );
}

function MegaMenu({ menu, onNavigate }: { menu: Menu; onNavigate: () => void }) {
  const [highlighted, setHighlighted] = useState(0);
  const feature = menu.features[highlighted];

  return (
    <div className="grid grid-cols-3 gap-2 lg:grid-cols-4">
      <div className="col-span-2 p-3">
        <p className="px-3 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-orange-ink">{menu.intro}</p>
        <ul className="mt-3 grid grid-cols-2 gap-1">
          {menu.features.map((item, index) => (
            <li key={item.title}>
              <MenuLink
                href={item.href}
                onClick={onNavigate}
                onMouseEnter={() => setHighlighted(index)}
                onFocus={() => setHighlighted(index)}
                className={`flex h-full gap-3 rounded-xl p-3 transition-colors focus-visible:outline-none ${index === highlighted ? "bg-navy/[0.06]" : "hover:bg-navy/[0.04]"}`}
              >
                <span className={`font-display text-[15px] leading-6 transition-colors ${index === highlighted ? "text-orange-deep" : "text-navy/35"}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-navy">{item.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-navy/65">{item.detail}</span>
                </span>
              </MenuLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col rounded-xl bg-sand p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-ink">{menu.linksTitle}</p>
        <ul className="mt-3 grid gap-0.5">
          {menu.links.map((link) => (
            <li key={link.title}>
              <MenuLink
                href={link.href}
                onClick={onNavigate}
                className="group flex items-center justify-between gap-3 rounded-lg py-2 text-[15px] font-medium text-navy transition-colors hover:text-orange-ink focus-visible:text-orange-ink focus-visible:outline-none"
              >
                <span className="min-w-0 break-words">{link.title}</span>
                <ArrowUpRightIcon className="size-4 shrink-0 text-navy/40 transition-[color,translate] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-orange-ink" />
              </MenuLink>
            </li>
          ))}
        </ul>
      </div>

      <div aria-hidden="true" className="relative hidden min-h-[272px] overflow-hidden rounded-xl bg-navy lg:block">
        {menu.features.map((item, index) => (
          <Image
            key={item.title}
            src={item.image.src}
            alt=""
            fill
            sizes="(min-width: 1760px) 430px, 25vw"
            className={`object-cover transition-[opacity,scale] duration-500 ${index === highlighted ? "scale-100 opacity-100" : "scale-105 opacity-0"}`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <span className="inline-flex rounded-full bg-orange px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy">
            {menu.label}
          </span>
          <p className="mt-3 font-display text-[28px] uppercase leading-none">{feature.title}</p>
          <p className="mt-2 text-[13px] leading-snug text-white/80">{feature.detail}</p>
        </div>
      </div>
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true">
      <path d="M3.5 6L8 10.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SiteHeader({ contactEmail, whatsappUrl }: { contactEmail: string; whatsappUrl: string }) {
  const menus = buildMenus(contactEmail, whatsappUrl);
  const [menuIndex, setMenuIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSection, setMobileSection] = useState<number | null>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const panelId = `${baseId}-panel`;

  function closeMenus() {
    setMenuOpen(false);
    setMobileOpen(false);
  }

  function toggleMenu(index: number) {
    if (menuOpen && index === menuIndex) {
      setMenuOpen(false);
      return;
    }
    setMenuIndex(index);
    setMenuOpen(true);
  }

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [mobileOpen]);

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
    <header className="pointer-events-none fixed inset-x-0 top-[clamp(10px,1.6vh,16px)] z-50 px-[clamp(12px,calc(3.2vw-8px),48px)]">
      {mobileOpen && <div aria-hidden="true" className="pointer-events-auto fixed inset-0 -z-10 bg-navy/45 backdrop-blur-[2px] md:hidden" />}
      <div ref={navRef} className="pointer-events-auto relative mx-auto max-w-[1744px]">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-navy/70 p-2 shadow-[0_12px_40px_rgba(5,14,28,0.28)] backdrop-blur-[10px] backdrop-saturate-150 md:gap-6">
          <Link href="/" aria-label="WCE Logistics home" className="shrink-0 pl-2 text-[clamp(13px,1.1vw,17px)]">
            <WceLogo />
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {menus.map((menu, index) => {
                const open = menuOpen && menuIndex === index;
                return (
                  <li key={menu.label}>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => toggleMenu(index)}
                      className={`flex h-10 items-center gap-2 rounded-xl px-4 text-[15px] font-medium text-white transition-colors hover:bg-white/10 ${open ? "bg-white/15" : ""}`}
                    >
                      {menu.label}
                      <Chevron open={open} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="hidden shrink-0 items-center gap-1 md:flex">
            <Link href="/sign-in" className="flex h-10 items-center rounded-xl px-4 text-[15px] font-medium text-white transition-colors hover:bg-white/10">
              Sign in
            </Link>
            <Link
              href="/sign-in?as=customer"
              className="flex h-10 items-center rounded-xl bg-orange px-5 text-[15px] font-semibold text-navy transition-colors hover:bg-white"
            >
              Book a truck
            </Link>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link href="/sign-in?as=customer" className="flex h-10 items-center whitespace-nowrap rounded-xl bg-orange px-3.5 text-[14px] font-semibold text-navy">
              Book a truck
            </Link>
            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls={`${baseId}-mobile`}
              aria-label={mobileOpen ? "Close" : "Menu"}
              onClick={() => setMobileOpen((value) => !value)}
              className="grid size-10 place-items-center rounded-xl border border-white/30 text-white transition-colors hover:bg-white/10"
            >
              {mobileOpen ? <CloseIcon className="size-5" /> : <MenuIcon className="size-5" />}
            </button>
          </div>
        </div>

        <div
          id={panelId}
          inert={!menuOpen}
          className={`absolute inset-x-0 top-full mt-2 hidden rounded-2xl border border-white/40 bg-white/90 p-2 text-navy shadow-[0_24px_60px_rgba(11,37,69,0.28)] backdrop-blur-xl transition-[opacity,translate,visibility] duration-200 md:block ${menuOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1.5 opacity-0"}`}
        >
          <MegaMenu key={menuIndex} menu={menus[menuIndex]} onNavigate={closeMenus} />
        </div>

        <div
          id={`${baseId}-mobile`}
          hidden={!mobileOpen}
          className="absolute inset-x-0 top-full mt-2 flex max-h-[calc(100svh-88px)] flex-col overflow-hidden rounded-2xl border border-white/40 bg-white text-navy shadow-[0_24px_60px_rgba(11,37,69,0.35)] md:hidden"
        >
          <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-1">
            {menus.map((menu, index) => {
              const open = mobileSection === index;
              const sectionId = `${baseId}-mobile-${index}`;
              return (
                <section key={menu.label} className="border-b border-navy/10 last:border-b-0">
                  <h2>
                    <button
                      type="button"
                      aria-expanded={open}
                      aria-controls={sectionId}
                      onClick={() => setMobileSection(open ? null : index)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-4 text-left text-[17px] font-semibold text-navy"
                    >
                      {menu.label}
                      <span className={`grid size-8 place-items-center rounded-full transition-colors ${open ? "bg-orange text-navy" : "bg-sand text-navy"}`}>
                        <Chevron open={open} />
                      </span>
                    </button>
                  </h2>
                  <div id={sectionId} hidden={!open} className="pb-3">
                    <ul className="grid gap-1">
                      {menu.features.map((item) => (
                        <li key={item.title}>
                          <MenuLink
                            href={item.href}
                            onClick={closeMenus}
                            className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-navy/5 focus-visible:bg-navy/5 focus-visible:outline-none"
                          >
                            <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-navy/10">
                              <Image src={item.image.src} alt="" fill sizes="48px" className="object-cover" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[15px] font-semibold text-navy">{item.title}</span>
                              <span className="block text-[13px] leading-snug text-navy/65">{item.detail}</span>
                            </span>
                          </MenuLink>
                        </li>
                      ))}
                    </ul>
                    <ul className="mt-2 flex flex-wrap gap-2 px-2">
                      {menu.links.filter((link) => !link.href.startsWith("/sign-in")).map((link) => (
                        <li key={link.title}>
                          <MenuLink
                            href={link.href}
                            onClick={closeMenus}
                            className="inline-flex h-9 items-center rounded-full bg-sand px-3.5 text-[13px] font-semibold text-navy transition-colors hover:bg-navy/10"
                          >
                            {link.title}
                          </MenuLink>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              );
            })}
          </div>
          <div className="grid gap-3 border-t border-navy/10 bg-sand/60 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/sign-in?as=customer"
                onClick={closeMenus}
                className="flex h-12 items-center justify-center rounded-xl bg-orange text-[15px] font-semibold text-navy"
              >
                Book a truck
              </Link>
              <Link
                href="/sign-in?as=vendor"
                onClick={closeMenus}
                className="flex h-12 items-center justify-center rounded-xl bg-navy text-[15px] font-semibold text-white"
              >
                List your truck
              </Link>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Link href="/sign-in" onClick={closeMenus} className="flex h-11 items-center px-2 text-[15px] font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
                Sign in
              </Link>
              <div className="flex gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Chat on WhatsApp"
                  className="grid size-11 place-items-center rounded-full bg-white text-[#25D366] shadow-[0_2px_8px_rgba(11,37,69,0.08)]"
                >
                  <WhatsAppIcon className="size-5" />
                </a>
                <a
                  href={`mailto:${contactEmail}`}
                  aria-label={`Email ${contactEmail}`}
                  className="grid size-11 place-items-center rounded-full bg-white text-orange-ink shadow-[0_2px_8px_rgba(11,37,69,0.08)]"
                >
                  <MailIcon className="size-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
