"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/lib/theme";
import { useI18n, LOCALE_NAMES, type Locale } from "@/lib/i18n";
import { BRAND_COLORS, BRAND_COLOR_KEYS } from "@/lib/colors";
import NavigationProgress from "@/components/NavigationProgress";
import GracePeriodBanner from "@/components/GracePeriodBanner";

/* ── SVG icon components for pixel-perfect alignment ── */
function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}
function IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function IconImage({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function IconUsers({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconWallet({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}
function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconMessages({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconStar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconCalendarView({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </svg>
  );
}

const NAV_KEYS = [
  { href: "/dashboard", key: "dashboard" as const, Icon: IconDashboard },
  { href: "/bookings", key: "bookings" as const, Icon: IconCalendar },
  { href: "/calendar", key: "calendar" as const, Icon: IconCalendarView },
  { href: "/galleries", key: "galleries" as const, Icon: IconImage },
  { href: "/clients", key: "clients" as const, Icon: IconUsers },
  { href: "/payments", key: "payments" as const, Icon: IconWallet },
  { href: "/messages", key: "messages" as const, Icon: IconMessages },
  { href: "/reviews", key: "reviews" as const, Icon: IconStar },
  { href: "/settings", key: "settings" as const, Icon: IconSettings },
];

// API endpoints to preload on mount for instant first navigation
const PRELOAD_APIS = [
  "/api/v1/dashboard",
  "/api/v1/bookings?page=1&limit=20&sortBy=created_at&sortOrder=desc",
];

// Map sidebar routes to their API endpoints for hover preloading
const ROUTE_API_MAP: Record<string, string> = {
  "/dashboard": "/api/v1/dashboard",
  "/bookings": "/api/v1/bookings?page=1&limit=20&sortBy=created_at&sortOrder=desc",
  "/calendar": `/api/v1/calendar?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`,
};

export default function PhotographerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme, brandColor, setBrandColor } = useTheme();
  const { locale, t, setLocale } = useI18n();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [profileName, setProfileName] = useState("");
  const [profileInitial, setProfileInitial] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Preload API data on layout mount & extract profile name
  useEffect(() => {
    fetch("/api/v1/dashboard")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const name = json.data.studio?.name || json.data.photographer?.fullName || "";
          setProfileName(name);
          setProfileInitial(name ? name.charAt(0).toUpperCase() : "");
        }
      })
      .catch(() => {});

    PRELOAD_APIS.forEach((url) => {
      fetch(url, { priority: "low" as RequestPriority }).catch(() => {});
    });

    // Fetch unread message count
    fetch("/api/v1/messages/unread")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setUnreadMessages(json.data?.unread_count || 0);
      })
      .catch(() => {});
  }, []);

  // Hide layout chrome on onboarding page
  if (pathname === "/onboarding") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/login");
  };

  const locales: Locale[] = ["en", "ta", "hi", "ml"];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Navigation progress bar ── */}
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>

      {/* ── Grace / Trial banner ── */}
      <GracePeriodBanner />

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 transform flex-col border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out dark:border-gray-800 dark:bg-gray-900 lg:static lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-800">
          <Link href="/dashboard" className="font-display text-xl font-bold text-brand-600">
            Pixova
          </Link>
          {/* Close button (mobile) */}
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 lg:hidden dark:hover:bg-gray-800"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3">
          {NAV_KEYS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                onClick={() => {
                  setMobileOpen(false);
                }}
                onMouseEnter={() => {
                  // Preload API data on hover for instant page render
                  const api = ROUTE_API_MAP[item.href];
                  if (api && !pathname.startsWith(item.href)) fetch(api).catch(() => {});
                }}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-gray-800 dark:text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200"
                }`}
              >
                <item.Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-brand-600 dark:text-brand-300" : ""}`} />
                <span>{t.nav[item.key]}</span>
                {item.key === "messages" && unreadMessages > 0 && (
                  <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 dark:border-gray-800 dark:bg-gray-900">
          {/* Left: hamburger (mobile) + logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden dark:text-gray-400 dark:hover:bg-gray-800"
              aria-label="Open menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-display text-lg font-bold text-brand-600 lg:hidden">
              Pixova
            </span>
          </div>

          {/* Right: profile dropdown */}
          <div ref={profileRef} className="relative ml-auto">
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600 transition-all hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Profile menu"
            >
              {profileInitial || "P"}
            </button>

            {/* ── Profile Dropdown ── */}
            {profileOpen && (
              <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 dark:shadow-black/40">

                {/* ── Header: Avatar + name ── */}
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    {profileInitial || "P"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{profileName || t.nav.photographer}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{t.nav.manageAccount}</p>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700" />

                {/* ── Appearance section ── */}
                <div className="p-3">
                  <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t.nav.appearance}</p>

                  {/* Theme toggle row */}
                  <button
                    onClick={toggleTheme}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50"
                  >
                    {theme === "light" ? (
                      <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                    ) : (
                      <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2m-7.07-15.07 1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m12.73-12.73 1.41-1.41" /></svg>
                    )}
                    <span className="flex-1 text-left">{theme === "light" ? t.theme.dark : t.theme.light}</span>
                    <div className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                      theme === "dark" ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"
                    }`}>
                      <div className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        theme === "dark" ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </div>
                  </button>

                  {/* Color picker row */}
                  <div className="mt-1 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      {BRAND_COLOR_KEYS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setBrandColor(c)}
                          title={BRAND_COLORS[c].label}
                          className={`flex h-6 w-6 items-center justify-center rounded-full transition-all ${
                            brandColor === c
                              ? "ring-2 ring-offset-2 ring-gray-400 scale-110 dark:ring-gray-500 dark:ring-offset-gray-800"
                              : "hover:scale-110"
                          }`}
                          style={{ backgroundColor: BRAND_COLORS[c].swatch }}
                        >
                          {brandColor === c && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700" />

                {/* ── Language section ── */}
                <div className="p-3">
                  <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t.language.label}</p>
                  <div className="grid grid-cols-2 gap-1">
                    {locales.map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLocale(l); setProfileOpen(false); }}
                        className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                          locale === l
                            ? "bg-gray-100 font-medium text-gray-900 dark:bg-gray-700 dark:text-white"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-300"
                        }`}
                      >
                        {LOCALE_NAMES[l]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-700" />

                {/* ── Logout ── */}
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    <span>{t.nav.logout}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
