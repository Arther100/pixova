// ============================================
// /g/[slug] — Public client gallery page
// No auth required. Clean shareable URL.
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { GalleryPasswordScreen } from "@/components/GalleryPasswordScreen";

interface Photo {
  id: string;
  filename: string;
  url: string;
  thumbnail_url: string | null;
  sort_order: number;
  is_selected: boolean;
  is_favorited: boolean;
  caption: string | null;
}

interface GalleryInfo {
  title: string;
  description: string | null;
  requires_pin: boolean;
  allow_download: boolean;
  allow_selection: boolean;
  selection_limit: number | null;
}

export default function PublicGalleryPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [gallery, setGallery] = useState<GalleryInfo | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  const fetchGallery = useCallback(
    async (pin?: string) => {
      try {
        const url = new URL(`/api/v1/gallery/${slug}`, window.location.origin);
        if (pin) url.searchParams.set("pin", pin);

        const res = await fetch(url.toString());
        const json = await res.json();

        if (!res.ok) {
          if (res.status === 410) {
            setError("This gallery has expired.");
            return;
          }
          if (res.status === 403) {
            setPinError("Incorrect PIN. Please try again.");
            return;
          }
          setError(json.error || "Gallery not found");
          return;
        }

        if (json.success) {
          setGallery(json.data.gallery);
          setPhotos(json.data.photos || []);
          setPinError(null);
        }
      } catch {
        setError("Failed to load gallery. Please try again.");
      } finally {
        setLoading(false);
        setPinLoading(false);
      }
    },
    [slug]
  );

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const handlePinSubmit = (pin: string) => {
    setPinLoading(true);
    fetchGallery(pin);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 text-center">
        <span className="text-5xl">📷</span>
        <h2 className="mt-4 text-lg font-semibold text-gray-900">{error}</h2>
      </div>
    );
  }

  // PIN required
  if (gallery?.requires_pin) {
    return (
      <GalleryPasswordScreen
        galleryTitle={gallery.title}
        onSubmit={handlePinSubmit}
        error={pinError}
        loading={pinLoading}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-gray-900">
            {gallery?.title}
          </h1>
          {gallery?.description && (
            <p className="mt-2 text-sm text-gray-500">{gallery.description}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            {photos.length} photos
          </p>
        </div>

        {/* Photo grid */}
        <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100"
              onClick={() => setLightboxIndex(idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbnail_url || photo.url}
                alt={photo.filename}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {photos.length === 0 && (
          <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-12 text-center">
            <span className="text-5xl">📷</span>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              No photos yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              The photographer hasn&apos;t uploaded photos to this gallery yet.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
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

      {/* Lightbox */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <PhotoLightbox
          url={photos[lightboxIndex].url}
          filename={photos[lightboxIndex].filename}
          onClose={() => setLightboxIndex(null)}
          onPrev={lightboxIndex > 0 ? () => setLightboxIndex(lightboxIndex - 1) : undefined}
          onNext={
            lightboxIndex < photos.length - 1
              ? () => setLightboxIndex(lightboxIndex + 1)
              : undefined
          }
          allowDownload={gallery?.allow_download ?? false}
        />
      )}
    </div>
  );
}
