import type { Metadata } from "next";

interface GalleryPageProps {
  params: {
    studioSlug: string;
    galleryId: string;
  };
}

export async function generateMetadata({
  params,
}: GalleryPageProps): Promise<Metadata> {
  // TODO: Fetch gallery details from Supabase
  return {
    title: `Gallery — ${params.studioSlug}`,
    description: "View and select your photos",
  };
}

export default function GalleryPage({ params }: GalleryPageProps) {
  const { studioSlug, galleryId } = params;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Studio header */}
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-gray-900">
          {/* Studio name from slug — placeholder */}
          {studioSlug.replace(/-/g, " ")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">Gallery • {galleryId}</p>
      </div>

      {/* Gallery grid placeholder */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
        <span className="text-5xl">📷</span>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          Gallery Loading...
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Photos will appear here once loaded from the server.
        </p>
      </div>

      {/* Selection footer — shown when selection mode is enabled */}
      <div className="fixed bottom-0 inset-x-0 border-t border-gray-200 bg-white p-4 text-center shadow-lg">
        <p className="text-sm text-gray-600">
          Select your favourite photos and tap{" "}
          <span className="font-semibold text-brand-600">Submit</span>
        </p>
      </div>
    </div>
  );
}
