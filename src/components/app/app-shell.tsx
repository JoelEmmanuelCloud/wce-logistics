import Link from "next/link";
import type { ReactNode } from "react";
import { signOutAction } from "@/app/(auth)/actions";
import { MobileNav } from "@/components/app/mobile-nav";
import { NavLinks, type NavItem } from "@/components/app/nav-links";
import { WceLogo } from "@/components/wce-logo";
import type { User } from "@/server/db/schema";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrator",
  vendor: "Truck vendor",
  customer: "Shipper",
  driver: "Driver",
};

function AccountFooter({ user }: { user: User }) {
  return (
    <div className="grid gap-3">
      <div>
        <p className="truncate text-[14px] font-semibold text-white">{user.fullName ?? user.email}</p>
        <p className="text-[12px] text-white/60">{user.role ? ROLE_LABELS[user.role] : "Account"}</p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="w-full rounded-full border border-white/25 px-4 py-2 text-[14px] font-medium text-white transition-colors hover:border-white/60"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

export function AppShell({ user, nav, children }: { user: User; nav: readonly NavItem[]; children: ReactNode }) {
  return (
    <div className="min-h-svh bg-sand text-navy lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="hidden bg-navy lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col lg:px-4 lg:py-6">
        <Link href="/" aria-label="WCE Logistics home" className="px-3 text-[16px]">
          <WceLogo />
        </Link>
        <nav aria-label="Dashboard" className="mt-10 flex-1">
          <NavLinks items={nav} />
        </nav>
        <div className="border-t border-white/10 px-1 pt-5">
          <AccountFooter user={user} />
        </div>
      </aside>
      <header className="relative flex items-center justify-between bg-navy px-4 py-3 lg:hidden">
        <Link href="/" aria-label="WCE Logistics home" className="text-[15px]">
          <WceLogo />
        </Link>
        <MobileNav items={nav} footer={<AccountFooter user={user} />} />
      </header>
      <main id="main" className="mx-auto w-full max-w-[1280px] px-[clamp(16px,3vw,48px)] py-[clamp(24px,4vw,48px)]">
        {children}
      </main>
    </div>
  );
}
