import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { requireRole } from "@/server/auth/dal";

export const instant = false;

export const metadata: Metadata = {
  title: { default: "Vendor dashboard", template: "%s | WCE Logistics vendor" },
  robots: { index: false },
};

const NAV = [
  { href: "/vendor", label: "Overview", exact: true },
  { href: "/vendor/profile", label: "Business profile" },
  { href: "/vendor/verification", label: "Verification" },
  { href: "/vendor/trucks", label: "Trucks" },
  { href: "/vendor/drivers", label: "Drivers" },
  { href: "/vendor/routes", label: "Trips" },
  { href: "/vendor/bookings", label: "Bookings" },
  { href: "/vendor/payouts", label: "Earnings" },
] as const;

export default async function VendorLayout({ children }: LayoutProps<"/vendor">) {
  const user = await requireRole("vendor");
  return (
    <AppShell user={user} nav={NAV}>
      {children}
    </AppShell>
  );
}
