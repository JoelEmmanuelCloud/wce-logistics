import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import type { NavItem } from "@/components/app/nav-links";
import { requireRole } from "@/server/auth/dal";

export const instant = false;

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | WCE Logistics admin" },
  robots: { index: false },
};

const NAV = [
  { href: "/admin", label: "Overview", exact: true, icon: "home", primary: true },
  { href: "/admin/vendors", label: "Vendors", icon: "users", primary: true },
  { href: "/admin/trucks", label: "Trucks", icon: "truck", primary: true },
  { href: "/admin/bookings", label: "Bookings", icon: "calendar", primary: true },
  { href: "/admin/orders", label: "Orders", icon: "receipt" },
  { href: "/admin/products", label: "Products", icon: "box" },
  { href: "/admin/payments", label: "Payments", icon: "receipt" },
  { href: "/admin/payouts", label: "Payouts", icon: "wallet" },
  { href: "/admin/reports", label: "Reports", icon: "chart" },
  { href: "/admin/disputes", label: "Disputes", icon: "flag" },
  { href: "/admin/reviews", label: "Reviews", icon: "star" },
  { href: "/admin/users", label: "Users", icon: "user" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
  { href: "/admin/audit", label: "Audit log", icon: "list" },
] as const satisfies readonly NavItem[];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole("admin");
  return (
    <AppShell user={user} nav={NAV}>
      {children}
    </AppShell>
  );
}
