"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/bookings", label: "Bookings", icon: "📅" },
  { href: "/galleries", label: "Galleries", icon: "🖼️" },
  { href: "/clients", label: "Clients", icon: "👥" },
  { href: "/payments", label: "Payments", icon: "💰" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function PhotographerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide layout chrome on onboarding page
  if (pathname === "/onboarding") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:block dark:border-gray-700 dark:bg-gray-900">
        <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6 dark:border-gray-700">
          <span className="font-display text-xl font-bold text-brand-600">
            Pixova
          </span>
        </div>

        <nav className="mt-4 space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-900">
          <div className="lg:hidden">
            <span className="font-display text-lg font-bold text-brand-600">
              Pixova
            </span>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {/* Profile avatar placeholder */}
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
              P
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
