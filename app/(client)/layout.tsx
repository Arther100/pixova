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
  maximumScale: 5, // allow zoom on gallery photos
};

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}

      {/* Minimal footer */}
      <footer className="border-t border-gray-100 py-4 text-center text-xs text-gray-400">
        Powered by{" "}
        <a
          href="https://pixova.in"
          className="font-medium text-brand-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Pixova
        </a>
      </footer>
    </div>
  );
}
