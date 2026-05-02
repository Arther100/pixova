"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import BulkDownloadButton from "@/components/gallery/BulkDownloadButton";

interface GalleryPhoto {
  id: string;
  url: string;
  thumbnail_url: string;
  filename: string;
  sort_order: number;
  caption: string | null;
  client_favourited?: boolean;
}

interface GalleryInfo {
  id: string;
  title: string;
  slug: string;
  photo_count: number;
  allow_download: boolean;
  download_enabled: boolean;
  published_at: string | null;
  selection_locked?: boolean;
  allow_selection?: boolean;
  selection_limit?: number | null;
}

export default function PortalGalleryPage() {
  const params = useParams();
  const portalToken = params.portalToken as string;
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [gallery, setGallery] = useState<GalleryInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [noGallery, setNoGallery] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "selected">("all");
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const selectedCount = photos.filter((p) => p.client_favourited).length;

  const fetchGallery = useCallback(async () => {
    try {
      const [galleryRes, selectionRes] = await Promise.all([
        fetch("/api/v1/portal/me/gallery"),
        fetch("/api/v1/portal/me/gallery/selection"),
      ]);
      const galleryJson = await galleryRes.json();
      const selectionJson = await selectionRes.json();

      if (galleryJson.success) {
        setGallery(galleryJson.data.gallery || null);

        // Merge client_favourited from selection data into photos
        const favouritedIds = new Set(
          (selectionJson.data?.selected_photos || []).map((p: { id: string }) => p.id)
        );
        const enrichedPhotos = (galleryJson.data.photos || []).map((p: GalleryPhoto) => ({
          ...p,
          client_favourited: favouritedIds.has(p.id),
        }));
        setPhotos(enrichedPhotos);
        setSelectionLocked(selectionJson.data?.selection_locked ?? false);
      } else {
        setNoGallery(true);
      }
    } catch {
      setNoGallery(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGallery();
  }, [fetchGallery]);

  const handleToggleSelect = async (photoId: string) => {
    if (selectionLocked || togglingId) return;
    setTogglingId(photoId);

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) { setTogglingId(null); return; }

    const newValue = !photo.client_favourited;
    const selectionLimit = gallery?.selection_limit;

    // Client-side limit pre-check
    if (newValue && selectionLimit) {
      const currentSelected = photos.filter((p) => p.client_favourited).length;
      if (currentSelected >= selectionLimit) {
        setToast(`Maximum ${selectionLimit} photos allowed. Deselect a photo first.`);
        setTimeout(() => setToast(null), 3000);
        setTogglingId(null);
        return;
      }
    }

    // Optimistic update
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, client_favourited: newValue } : p))
    );

    try {
      const endpoint = gallery?.allow_selection
        ? `/api/v1/portal/me/gallery/photos/${photoId}/select`
        : `/api/v1/portal/me/gallery/photos/${photoId}/favourite`;
      const body = gallery?.allow_selection
        ? { selected: newValue }
        : { favourited: newValue };

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!json.success) {
        // Revert optimistic update
        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, client_favourited: !newValue } : p))
        );
        if (json.error?.toLowerCase().includes('locked')) {
          setSelectionLocked(true);
        }
        setToast(json.error || "Failed to save selection");
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      // Revert
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, client_favourited: !newValue } : p))
      );
      setToast("Failed to save selection");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setTogglingId(null);
    }
  };

  const displayPhotos = filter === "selected" ? photos.filter((p) => p.client_favourited) : photos;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-4 z-50 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 shadow-lg">
          {toast}
        </div>
      )}

      <Link href={`/portal/${portalToken}/overview`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← Back to Overview
      </Link>

      <h1 className="text-lg font-bold text-gray-900">Gallery</h1>

      {noGallery || photos.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center">
          <span className="text-4xl">📷</span>
          <p className="mt-3 text-sm text-gray-500">Your gallery is not ready yet.</p>
          <p className="mt-1 text-xs text-gray-400">Photos will appear here once your photographer publishes them.</p>
        </div>
      ) : (
        <>
          {/* Selection locked banner */}
          {selectionLocked && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                📌 Your selection has been locked by your photographer.
              </p>
              <p className="mt-1 text-xs text-amber-600">
                They are now editing your {selectedCount} selected photo{selectedCount !== 1 ? "s" : ""}.
              </p>
            </div>
          )}

          {/* Selection counter bar */}
          <div className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {gallery?.allow_selection && gallery.selection_limit
                    ? `♥ ${selectedCount} of ${gallery.selection_limit} selected`
                    : `♥ ${selectedCount} photo${selectedCount !== 1 ? "s" : ""} selected`}
                </p>
                {selectedCount === 0 && !selectionLocked && (
                  <p className="text-xs text-gray-400">
                    Tap the ♥ on photos you love. Your photographer will edit your picks.
                  </p>
                )}
                {gallery?.allow_selection && gallery.selection_limit && selectedCount >= gallery.selection_limit && !selectionLocked && (
                  <p className="text-xs font-medium text-amber-600">
                    Maximum {gallery.selection_limit} photos reached.
                  </p>
                )}
              </div>
              <span className="text-xs text-gray-400">{photos.length} total</span>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              All Photos
            </button>
            <button
              onClick={() => setFilter("selected")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                filter === "selected"
                  ? "bg-yellow-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Selected ♥ {selectedCount}
            </button>
          </div>

          {/* Download buttons */}
          {gallery?.download_enabled && (
            <BulkDownloadButton
              downloadEndpoint="/api/v1/portal/me/gallery/download-urls"
              totalPhotos={photos.length}
              selectedCount={selectedCount}
              downloadEnabled={gallery.download_enabled}
            />
          )}

          {/* Photo grid */}
          {displayPhotos.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center">
              <span className="text-3xl">♥</span>
              <p className="mt-2 text-sm text-gray-500">No photos selected yet.</p>
              <button onClick={() => setFilter("all")} className="mt-2 text-xs font-medium text-brand-600">
                View all photos →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {displayPhotos.map((photo) => (
                <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-50">
                  {/* Photo */}
                  <button
                    onClick={() => {
                      const realIdx = photos.findIndex((p) => p.id === photo.id);
                      setLightboxIdx(realIdx);
                    }}
                    className="h-full w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbnail_url || photo.url}
                      alt={photo.filename}
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      loading="lazy"
                    />
                  </button>

                  {/* Favourite button overlay */}
                  {photo.client_favourited && (
                    <div className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-inset ring-yellow-400" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleSelect(photo.id);
                    }}
                    disabled={selectionLocked}
                    className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full shadow-md transition-all ${
                      photo.client_favourited
                        ? "bg-yellow-400 text-white"
                        : "bg-white/80 text-gray-400 hover:bg-white hover:text-yellow-500"
                    } ${selectionLocked ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    ♥
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox overlay */}
      {lightboxIdx !== null && photos[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Close */}
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30"
          >
            ✕
          </button>

          {/* Prev */}
          {lightboxIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
              className="absolute left-4 rounded-full bg-white/20 p-3 text-white hover:bg-white/30"
            >
              ‹
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[lightboxIdx].url}
            alt={photos[lightboxIdx].filename}
            className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Next */}
          {lightboxIdx < photos.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
              className="absolute right-4 rounded-full bg-white/20 p-3 text-white hover:bg-white/30"
            >
              ›
            </button>
          )}

          {/* Bottom bar: counter + favourite + download */}
          <div className="absolute bottom-4 flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-xs text-white/60">
              {lightboxIdx + 1} / {photos.length}
            </p>
            <button
              onClick={() => handleToggleSelect(photos[lightboxIdx].id)}
              disabled={selectionLocked}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                photos[lightboxIdx].client_favourited
                  ? "bg-yellow-400 text-white"
                  : "bg-white/20 text-white hover:bg-white/30"
              } ${selectionLocked ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {photos[lightboxIdx].client_favourited ? "♥ Selected" : "♥ Select"}
            </button>
            {gallery?.download_enabled && (
              <a
                href={photos[lightboxIdx].url}
                download={photos[lightboxIdx].filename}
                className="rounded-full bg-white/20 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/30"
              >
                ⬇ Download
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
