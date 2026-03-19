"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", icon: "🏠" },
  { key: "gallery", label: "Gallery", icon: "🖼️" },
  { key: "payments", label: "Payments", icon: "💳" },
  { key: "feedback", label: "Feedback", icon: "⭐" },
];

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const portalToken = params.portalToken as string;

  return (
    <div className="flex min-h-screen flex-col bg-white text-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href={`/portal/${portalToken}/overview`} className="font-display text-lg font-bold text-brand-600">
            Pixova
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>

      {/* Bottom nav (mobile-first) */}
      <nav className="sticky bottom-0 z-30 border-t border-gray-100 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const href = `/portal/${portalToken}/${item.key}`;
            const isActive = pathname.includes(`/${item.key}`);
            return (
              <Link
                key={item.key}
                href={href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "text-brand-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <footer className="border-t border-gray-50 py-3 text-center text-xs text-gray-300">
        Powered by{" "}
        <a href="https://pixova.in" className="font-medium text-brand-600 hover:underline" target="_blank" rel="noopener noreferrer">
          Pixova
        </a>
      </footer>
    </div>
  );
}
