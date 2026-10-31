import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import type { NavItem } from "@/components/app/nav-links";
import { requireRole } from "@/server/auth/dal";

export const instant = false;

export const metadata: Metadata = {
  title: { default: "Your account", template: "%s | WCE Logistics" },
  robots: { index: false },
};

const NAV = [
  { href: "/account", label: "Overview", exact: true, icon: "home", primary: true },
  { href: "/account/orders", label: "Orders", icon: "receipt", primary: true },
  { href: "/account/shipments", label: "Shipments", icon: "box", primary: true },
  { href: "/account/bookings", label: "Bookings", icon: "calendar", primary: true },
  { href: "/shop", label: "Shop", icon: "store" },
] as const satisfies readonly NavItem[];

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await requireRole("customer");
  return (
    <AppShell user={user} nav={NAV}>
      {children}
    </AppShell>
  );
}
