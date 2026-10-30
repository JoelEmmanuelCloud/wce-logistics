import type { Metadata } from "next";
import { AppShell } from "@/components/app/app-shell";
import type { NavItem } from "@/components/app/nav-links";
import { requireRole } from "@/server/auth/dal";

export const instant = false;

export const metadata: Metadata = {
  title: { default: "Deliveries", template: "%s | WCE Logistics driver" },
  robots: { index: false },
};

const NAV = [{ href: "/driver", label: "Deliveries", exact: true, icon: "box", primary: true }] as const satisfies readonly NavItem[];

export default async function DriverLayout({ children }: LayoutProps<"/driver">) {
  const user = await requireRole("driver");
  return (
    <AppShell user={user} nav={NAV}>
      {children}
    </AppShell>
  );
}
