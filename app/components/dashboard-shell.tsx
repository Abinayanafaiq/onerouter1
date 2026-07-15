"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { CreditBadge } from "@/app/components/credit-badge";
import { LanguageSwitcher } from "@/app/components/language-switcher";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
};

const NAV_MAIN_DEFS = [
  {
    key: "overview" as const,
    href: "/dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
        <path d="M3 13h8V3H3v10Zm0 8h8v-6H3v6Zm10 0h8V11h-8v10Zm0-18v6h8V3h-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "playground" as const,
    href: "/dashboard/chat",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
        <path d="M8 10h8M8 14h5M21 12a8.5 8.5 0 0 1-11.8 7.8L4 21l1.2-5.2A8.5 8.5 0 1 1 21 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "apiKeys" as const,
    href: "/dashboard/api-keys",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
        <path d="m15.5 7.5 1-1m2-2 1-1m-4 4a4.95 4.95 0 0 1 0 7L13 13m4.5-4.5a4.95 4.95 0 0 0-7 0L4 15v5h5l6.5-6.5m-2-2 2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "models" as const,
    href: "/dashboard/models",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
        <path d="M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "usage" as const,
    href: "/dashboard/usage",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
        <path d="M3 3v18h18M7 14l3-4 3 3 5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "billing" as const,
    href: "/dashboard/wallet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
        <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2 10h20M6 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

const NAV_SECONDARY_DEFS = [
  {
    key: "documentation" as const,
    href: "/dashboard/docs",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
        <path d="M4 4a2 2 0 0 1 2-2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Zm9-2v5h5M8 13h8M8 17h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    key: "settings" as const,
    href: "/dashboard/settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
        <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

function initials(name: string): string {
  const parts = name.trim().split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 ${
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
            }`}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_12px_var(--accent-glow)]" />
            )}
            <span
              className={`shrink-0 transition-colors duration-200 ${
                active ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
              }`}
            >
              {item.icon}
            </span>
            <span className="truncate">{item.label}</span>
            {item.badge && (
              <span className="ml-auto rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  children,
  userEmail,
  userName,
  initialToks,
  telegramGroupUrl,
  signOutAction,
}: {
  children: React.ReactNode;
  userEmail: string;
  userName: string;
  initialToks: number;
  telegramGroupUrl: string | null;
  signOutAction: () => Promise<void>;
}) {
  const t = useTranslations("Dashboard");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navMain: NavItem[] = NAV_MAIN_DEFS.map((d) => ({
    label: t(d.key),
    href: d.href,
    icon: d.icon,
  }));
  const navSecondary: NavItem[] = NAV_SECONDARY_DEFS.map((d) => ({
    label: t(d.key),
    href: d.href,
    icon: d.icon,
  }));

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(60% 40% at 12% -5%, rgba(0,255,136,0.06) 0%, transparent 60%), radial-gradient(50% 40% at 100% -5%, rgba(99,102,241,0.06) 0%, transparent 55%)",
        }}
      />

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-white/[0.06] bg-[#070708] lg:flex">
        <SidebarContent
          pathname={pathname}
          userName={userName}
          userEmail={userEmail}
          telegramGroupUrl={telegramGroupUrl}
          signOutAction={signOutAction}
          navMain={navMain}
          navSecondary={navSecondary}
          systemsOk={t("systemsOk")}
          systemsDetail={t("systemsDetail")}
          signOutLabel={t("signOut")}
        />
      </aside>

      {/* Sidebar (mobile slide-over) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-white/10 bg-[#070708] animate-fade-up">
            <SidebarContent
              pathname={pathname}
              userName={userName}
              userEmail={userEmail}
              telegramGroupUrl={telegramGroupUrl}
              signOutAction={signOutAction}
              onNavigate={() => setMobileOpen(false)}
              navMain={navMain}
              navSecondary={navSecondary}
              systemsOk={t("systemsOk")}
              systemsDetail={t("systemsDetail")}
              signOutLabel={t("signOut")}
            />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="relative z-10 lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          {/* Mobile menu */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          {/* Brand (mobile) */}
          <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-foreground text-[10px] font-bold text-background">9i</span>
            <span className="text-sm font-semibold">9inference</span>
          </Link>

          {/* Org context (desktop) */}
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-[13px] font-medium text-foreground/90">Personal Workspace</span>
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-muted-foreground">Production</span>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            {/* Token balance */}
            <CreditBadge initialToks={initialToks} />

            {/* Notifications */}
            <button
              type="button"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-muted-foreground transition hover:text-foreground focus-ring"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" />
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-1.5 py-1 transition hover:border-white/20 focus-ring"
              >
                <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-accent/80 to-[#6366F1]/80 text-[11px] font-bold text-black">
                  {initials(userName)}
                </span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{userEmail}</span>
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0b0b0f] shadow-2xl animate-fade-up">
                    <div className="border-b border-white/[0.06] px-3 py-3">
                      <div className="truncate text-xs font-medium text-foreground">{userName}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{userEmail}</div>
                    </div>
                    <div className="p-1.5">
                      <Link
                        href="/dashboard/settings"
                        onClick={() => setProfileOpen(false)}
                        className="block rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
                      >
                        Account settings
                      </Link>
                      <a
                        href="/dashboard/docs"
                        onClick={() => setProfileOpen(false)}
                        className="block rounded-lg px-2.5 py-2 text-xs text-muted-foreground transition hover:bg-white/[0.04] hover:text-foreground"
                      >
                        API documentation
                      </a>
                      <form action={signOutAction}>
                        <button
                          type="submit"
                          className="block w-full rounded-lg px-2.5 py-2 text-left text-xs text-red-400 transition hover:bg-red-500/10"
                        >
                          Sign out
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({
  pathname,
  userName,
  userEmail,
  telegramGroupUrl,
  signOutAction,
  onNavigate,
  navMain,
  navSecondary,
  systemsOk,
  systemsDetail,
  signOutLabel,
}: {
  pathname: string;
  userName: string;
  userEmail: string;
  telegramGroupUrl: string | null;
  signOutAction: () => Promise<void>;
  onNavigate?: () => void;
  navMain: NavItem[];
  navSecondary: NavItem[];
  systemsOk: string;
  systemsDetail: string;
  signOutLabel: string;
}) {
  return (
    <>
      {/* Brand */}
      <div className="flex h-14 items-center gap-2.5 border-b border-white/[0.06] px-4">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-foreground text-[11px] font-bold text-background">
          9i
        </span>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold tracking-tight">9inference</div>
          <div className="text-[10px] text-muted-foreground">AI Inference Platform</div>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Platform
        </div>
        <NavList items={navMain} pathname={pathname} onNavigate={onNavigate} />

        <div className="mb-2 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Resources
        </div>
        <NavList items={navSecondary} pathname={pathname} onNavigate={onNavigate} />

        {telegramGroupUrl && (
          <div className="mt-4 px-3">
            <a
              href={telegramGroupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-[12px] font-medium text-foreground transition hover:border-white/20 hover:bg-white/[0.06]"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px] text-accent">
                <path d="m21.5 4.5-3 15a1.5 1.5 0 0 1-2.2 1L11 17l-2.5 2.5a.8.8 0 0 1-1.4-.6V15l9-8-11 7L2 12.5a1 1 0 0 1 .1-1.9l18.5-7a1 1 0 0 1 1 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              <span>Join our Telegram group</span>
              <svg viewBox="0 0 24 24" fill="none" className="ml-auto h-3.5 w-3.5 text-muted-foreground">
                <path d="M7 17 17 7M7 7h10v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>
        )}
      </div>

      {/* Status footer */}
      <div className="border-t border-white/[0.06] p-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-[11px] font-medium text-foreground">{systemsOk}</span>
          </div>
          <div className="mt-1.5 text-[10px] text-muted-foreground">
            {systemsDetail}
          </div>
        </div>
      </div>
    </>
  );
}
