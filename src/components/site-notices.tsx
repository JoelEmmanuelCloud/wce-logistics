"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { buttonClasses } from "@/components/ui/button-classes";
import { COOKIE_NOTICE_COOKIE, INSTALL_DISMISSED_COOKIE } from "@/lib/shop";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

type Notice = "cookies" | "install" | "install-ios" | null;

const APP_AREAS = ["/account", "/vendor", "/admin", "/driver"];

function hasCookie(name: string): boolean {
  return document.cookie.split("; ").some((entry) => entry.startsWith(`${name}=`));
}

function setCookie(name: string, days: number): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=1; Max-Age=${days * 24 * 60 * 60}; Path=/; SameSite=Lax${secure}`;
}

function installNotice(event: InstallEvent | null): Notice {
  if (
    !hasCookie(COOKIE_NOTICE_COOKIE) ||
    hasCookie(INSTALL_DISMISSED_COOKIE) ||
    !window.matchMedia("(max-width: 767px)").matches ||
    window.matchMedia("(display-mode: standalone)").matches
  ) {
    return null;
  }
  if (event) {
    return "install";
  }
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ? "install-ios" : null;
}

export function SiteNotices() {
  const [notice, setNotice] = useState<Notice>(null);
  const installEvent = useRef<InstallEvent | null>(null);
  const pathname = usePathname();
  const inApp = APP_AREAS.some((area) => pathname === area || pathname.startsWith(`${area}/`));

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.error(error));
    }
    let settled = false;
    const onInstallReady = (event: Event) => {
      event.preventDefault();
      installEvent.current = event as InstallEvent;
      if (settled) {
        setNotice((current) => current ?? installNotice(installEvent.current));
      }
    };
    const onInstalled = () => {
      installEvent.current = null;
      setNotice(null);
    };
    window.addEventListener("beforeinstallprompt", onInstallReady);
    window.addEventListener("appinstalled", onInstalled);
    const timer = window.setTimeout(() => {
      settled = true;
      setNotice(hasCookie(COOKIE_NOTICE_COOKIE) ? installNotice(installEvent.current) : "cookies");
    }, 1200);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onInstallReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function acceptCookies() {
    setCookie(COOKIE_NOTICE_COOKIE, 365);
    setNotice(installNotice(installEvent.current));
  }

  function dismissInstall() {
    setCookie(INSTALL_DISMISSED_COOKIE, 60);
    setNotice(null);
  }

  async function install() {
    const event = installEvent.current;
    if (!event) {
      return;
    }
    await event.prompt();
    await event.userChoice;
    installEvent.current = null;
    setNotice(null);
  }

  if (!notice) {
    return null;
  }

  return (
    <aside
      aria-label={notice === "cookies" ? "Cookie notice" : "Install the app"}
      className={`fixed inset-x-3 z-40 rounded-2xl border border-navy/10 bg-white p-4 text-navy shadow-[0_24px_60px_rgba(11,37,69,0.28)] md:left-auto md:right-6 md:w-[26rem] ${
        inApp ? "bottom-[calc(76px+env(safe-area-inset-bottom))] lg:bottom-6" : "bottom-[calc(12px+env(safe-area-inset-bottom))] md:bottom-6"
      }`}
    >
      {notice === "cookies" && (
        <>
          <p className="text-[14px] leading-relaxed text-navy/80">We only use essential cookies, to keep you signed in and remember your cart and delivery state. No tracking.</p>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={acceptCookies} className={buttonClasses("primary", "sm")}>
              OK
            </button>
            <Link href="/cookies" className="text-[14px] font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4">
              Cookie policy
            </Link>
          </div>
        </>
      )}
      {notice === "install" && (
        <>
          <p className="text-[15px] font-semibold">Add WCE Logistics to your home screen</p>
          <p className="mt-1 text-[14px] leading-relaxed text-navy/70">Open it like an app, with no download from the store.</p>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" onClick={install} className={buttonClasses("primary", "sm")}>
              Install
            </button>
            <button type="button" onClick={dismissInstall} className="text-[14px] font-semibold text-navy/70">
              Not now
            </button>
          </div>
        </>
      )}
      {notice === "install-ios" && (
        <>
          <p className="text-[15px] font-semibold">Add WCE Logistics to your home screen</p>
          <p className="mt-1 text-[14px] leading-relaxed text-navy/70">Tap the Share button in your browser, then choose Add to Home Screen.</p>
          <button type="button" onClick={dismissInstall} className="mt-3 text-[14px] font-semibold text-navy/70">
            Not now
          </button>
        </>
      )}
    </aside>
  );
}
