import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import type { NavItem } from "@/components/app/nav-links";
import { requireRole } from "@/server/auth/dal";

export const instant = false;

export const metadata: Metadata = {
  title: { default: "Vendor dashboard", template: "%s | WCE Logistics vendor" },
  robots: { index: false },
};

const NAV = [
  { href: "/vendor", label: "Overview", exact: true, icon: "home", primary: true },
  { href: "/vendor/profile", label: "Business profile", icon: "user" },
  { href: "/vendor/verification", label: "Verification", icon: "shield" },
  { href: "/vendor/trucks", label: "Trucks", icon: "truck", primary: true },
  { href: "/vendor/drivers", label: "Drivers", icon: "idCard" },
  { href: "/vendor/routes", label: "Trips", icon: "route", primary: true },
  { href: "/vendor/bookings", label: "Bookings", icon: "calendar", primary: true },
  { href: "/vendor/payouts", label: "Earnings", icon: "wallet" },
  { href: "/vendor/reviews", label: "Reviews", icon: "star" },
] as const satisfies readonly NavItem[];

export default async function VendorLayout({ children }: LayoutProps<"/vendor">) {
  const user = await requireRole("vendor");
  return (
    <AppShell user={user} nav={NAV}>
      {children}
    </AppShell>
  );
}
