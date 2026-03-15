// ============================================
// /g/ layout — force light mode for public gallery
// Clients should always see a clean white gallery
// regardless of the photographer's dark mode setting
// ============================================

import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Pixova Gallery",
    default: "Gallery | Pixova",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function PublicGalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto"
      style={{ background: "#ffffff", color: "#111827" }}
    >
      {children}
    </div>
  );
}
