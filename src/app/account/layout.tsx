import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import { requireRole } from "@/server/auth/dal";

export const instant = false;

export const metadata: Metadata = {
  title: { default: "Your account", template: "%s | WCE Logistics" },
  robots: { index: false },
};

const NAV = [
  { href: "/account", label: "Overview", exact: true },
  { href: "/account/shipments", label: "Shipments" },
  { href: "/account/bookings", label: "Bookings" },
] as const;

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  const user = await requireRole("customer");
  return (
    <AppShell user={user} nav={NAV}>
      {children}
    </AppShell>
  );
}
