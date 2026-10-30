"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { NavLinks, type NavItem } from "@/components/app/nav-links";

export function MobileNav({ items, footer }: { items: readonly NavItem[]; footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 items-center rounded-xl border border-white/30 px-4 text-[14px] font-medium text-white lg:hidden"
      >
        {open ? "Close" : "Menu"}
      </button>
      <div id={panelId} hidden={!open} className="absolute inset-x-0 top-full z-40 border-t border-white/10 bg-navy px-4 pb-6 pt-3 shadow-[0_24px_40px_rgba(11,37,69,0.35)] lg:hidden">
        <NavLinks items={items} onNavigate={() => setOpen(false)} />
        <div className="mt-4 border-t border-white/10 pt-4">{footer}</div>
      </div>
    </>
  );
}
