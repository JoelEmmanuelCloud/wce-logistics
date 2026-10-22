import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { requireRole } from "@/server/auth/dal";

export const instant = false;

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | WCE Logistics admin" },
  robots: { index: false },
};

const NAV = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/trucks", label: "Trucks" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/payouts", label: "Payouts" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/audit", label: "Audit log" },
] as const;

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireRole("admin");
  return (
    <AppShell user={user} nav={NAV}>
      {children}
    </AppShell>
  );
}
