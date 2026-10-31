"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  BoxIcon,
  CalendarIcon,
  ChartIcon,
  FlagIcon,
  HomeIcon,
  IdCardIcon,
  ListIcon,
  ReceiptIcon,
  RouteIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StarIcon,
  StoreIcon,
  TruckLineIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from "@/components/line-icons";

export const NAV_ICONS = {
  home: HomeIcon,
  box: BoxIcon,
  calendar: CalendarIcon,
  chart: ChartIcon,
  flag: FlagIcon,
  idCard: IdCardIcon,
  list: ListIcon,
  receipt: ReceiptIcon,
  route: RouteIcon,
  settings: SettingsIcon,
  shield: ShieldCheckIcon,
  star: StarIcon,
  store: StoreIcon,
  truck: TruckLineIcon,
  user: UserIcon,
  users: UsersIcon,
  wallet: WalletIcon,
} satisfies Record<string, ComponentType<{ className?: string }>>;

export type NavItem = { href: string; label: string; icon: keyof typeof NAV_ICONS; exact?: boolean; primary?: boolean };

export function isActive(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function NavLinks({ items }: { items: readonly NavItem[] }) {
  const pathname = usePathname();
  return (
    <ul className="grid gap-1">
      {items.map((item) => {
        const active = isActive(item, pathname);
        const Icon = NAV_ICONS[item.icon];
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors ${
                active ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className={`size-5 shrink-0 ${active ? "text-orange" : "text-white/50"}`} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
