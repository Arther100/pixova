// ============================================
// /(photographer)/galleries/[bookingId] — Gallery management for a booking
// Upload photos, configure settings, publish/share
// ============================================

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui";
import { PhotoUploadZone, type PhotoUploadZoneRef } from "@/components/PhotoUploadZone";
import { PhotoGrid } from "@/components/PhotoGrid";
import { PhotoLightbox } from "@/components/PhotoLightbox";
import { StorageBar } from "@/components/StorageBar";
import BulkDownloadButton from "@/components/gallery/BulkDownloadButton";

interface Gallery {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  status: string;
  photo_count: number;
  total_size_bytes: number;
  allow_download: boolean;
  allow_selection: boolean;
  selection_limit: number | null;
  pin: string | null;
  watermark_enabled: boolean;
  expires_at: string | null;
  published_at: string | null;
}

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string | null;
  original_filename: string;
  sort_order: number;
  is_selected?: boolean;
  client_visible?: boolean;
}

interface StorageInfo {
  used_bytes: number;
  limit_bytes: number;
}

export default function GalleryManagePage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const { t } = useI18n();

  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManageMode, setIsManageMode] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stagedCount, setStagedCount] = useState(0);
  const uploadRef = useRef<PhotoUploadZoneRef>(null);
  const [showClientPicks, setShowClientPicks] = useState(false);
  const [selectionLocked, setSelectionLocked] = useState(false);
  const [clientPicksCount, setClientPicksCount] = useState(0);
  const [clientPicks, setClientPicks] = useState<Photo[]>([]);
  const [lockToggling, setLockToggling] = useState(false);

  // Gallery settings form
  const [settingsPin, setSettingsPin] = useState("");
  const [settingsDownload, setSettingsDownload] = useState(true);
  const [settingsSelection, setSettingsSelection] = useState(false);
  const [settingsSelectionLimit, setSettingsSelectionLimit] = useState<number>(0);

  const showToast = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Initialize gallery
  const initGallery = useCallback(async () => {
    try {
      // Try to get existing gallery
      let res = await fetch(`/api/v1/galleries/${bookingId}`);
      let json = await res.json();

      if (res.status === 404) {
        // Initialize gallery
        res = await fetch(`/api/v1/galleries/${bookingId}/init`, {
          method: "POST",
        });
        json = await res.json();
      }

      if (json.success) {
        const g = json.data.gallery;
        setGallery(g);
        setSettingsPin(g.pin || "");
        setSettingsDownload(g.allow_download ?? true);
        setSettingsSelection(g.allow_selection ?? false);
        setSettingsSelectionLimit(g.selection_limit ?? 0);
      } else {
        setError(json.error || "Failed to load gallery");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/galleries/${bookingId}/photos`);
      const json = await res.json();
      if (json.success) {
        setPhotos(json.data.photos || []);
      }
    } catch {
      // non-critical
    }
  }, [bookingId]);

  // Fetch storage info
  const fetchStorage = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/galleries/storage");
      const json = await res.json();
      if (json.success) {
        setStorage({
          used_bytes: json.data.used_bytes,
          limit_bytes: json.data.limit_bytes,
        });
      }
    } catch {
      // non-critical
    }
  }, []);

  // Fetch client selection data
  const fetchClientPicks = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/galleries/${bookingId}/selection`);
      const json = await res.json();
      if (json.success) {
        setSelectionLocked(json.data.selection_locked ?? false);
        setClientPicksCount(json.data.selected_count ?? 0);
        setClientPicks(
          (json.data.selected_photos || []).map((p: { photo_id: string; url: string; filename: string; sort_order: number }) => ({
            id: p.photo_id,
            url: p.url,
            thumbnail_url: null,
            original_filename: p.filename,
            sort_order: p.sort_order,
          }))
        );
      }
    } catch {
      // non-critical
    }
  }, [bookingId]);

  // Toggle lock/unlock selection
  const handleToggleLock = async () => {
    setLockToggling(true);
    try {
      const res = await fetch(`/api/v1/galleries/${bookingId}/selection`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selection_locked: !selectionLocked }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectionLocked(json.data.selection_locked);
        showToast("success", json.data.selection_locked ? "Selection locked" : "Selection unlocked");
      } else {
        showToast("error", json.error || "Failed to toggle lock");
      }
    } catch {
      showToast("error", "Network error");
    } finally {
      setLockToggling(false);
    }
  };

  useEffect(() => {
    initGallery();
    fetchPhotos();
    fetchStorage();
    fetchClientPicks();
  }, [initGallery, fetchPhotos, fetchStorage, fetchClientPicks]);

  // Delete photo
  const handleDeletePhoto = async (photoId: string) => {
    try {
      const res = await fetch(
        `/api/v1/galleries/${bookingId}/photos/${photoId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (json.success) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        fetchStorage();
        showToast("success", "Photo deleted");
      } else {
        showToast("error", json.error || "Failed to delete photo");
      }
    } catch {
      showToast("error", "Network error");
    }
  };

  // Toggle visibility
  const handleToggleVisibility = async (photoId: string, visible: boolean) => {
    try {
      const res = await fetch(
        `/api/v1/galleries/${bookingId}/photos/${photoId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ client_visible: visible }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId ? { ...p, client_visible: visible } : p
          )
        );
      }
    } catch {
      // silent
    }
  };

  // Publish gallery — upload staged photos first, then set status
  const handlePublish = async () => {
    if (!gallery) return;
    setPublishing(true);
    try {
      // If there are staged photos, upload them first
      if (uploadRef.current && uploadRef.current.stagedCount > 0) {
        await uploadRef.current.startUpload();
      }

      // Then publish
      const res = await fetch(`/api/v1/galleries/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "published" }),
      });
      const json = await res.json();
      if (json.success) {
        setGallery(json.data.gallery);
        showToast("success", t.galleries.published);
        fetchPhotos();
        fetchStorage();
      } else {
        showToast("error", json.error || "Failed to publish");
      }
    } catch {
      showToast("error", "Network error");
    } finally {
      setPublishing(false);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      const res = await fetch(`/api/v1/galleries/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: settingsPin || null,
          allow_download: settingsDownload,
          allow_selection: settingsSelection,
          selection_limit: settingsSelection ? settingsSelectionLimit : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGallery(json.data.gallery);
        setShowSettings(false);
        showToast("success", t.galleries.settingsSaved);
      } else {
        showToast("error", json.error || "Failed to save settings");
      }
    } catch {
      showToast("error", "Network error");
    }
  };

  // Copy share link
  const handleCopyLink = () => {
    if (!gallery) return;
    const link = `${window.location.origin}/g/${gallery.slug}`;
    navigator.clipboard.writeText(link);
    showToast("success", t.galleries.linkCopied);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-40 rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-gray-200 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-4xl">⚠️</span>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <Link href="/bookings" className="mt-4">
          <Button variant="secondary">{t.bookings.backToBookings}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {statusMsg && (
        <div
          className={`fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg ${
            statusMsg.type === "success"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/40"
              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/40"
          }`}
        >
          <span
            className={`text-sm font-medium ${
              statusMsg.type === "success"
                ? "text-green-800 dark:text-green-200"
                : "text-red-800 dark:text-red-200"
            }`}
          >
            {statusMsg.text}
          </span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/bookings" className="hover:text-brand-600 dark:hover:text-brand-400">
          {t.bookings.title}
        </Link>
        <span>/</span>
        <Link href={`/bookings/${bookingId}`} className="hover:text-brand-600 dark:hover:text-brand-400">
          {gallery?.title || bookingId.slice(0, 8)}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{t.galleries.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            {gallery?.title || t.galleries.title}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {gallery?.status === "published" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/40 dark:text-green-300">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Draft
              </span>
            )}
            <span>{photos.length} photos</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsManageMode(!isManageMode)}
          >
            {isManageMode ? t.galleries.done : t.galleries.manage}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowSettings(!showSettings)}>
            {t.galleries.settings}
          </Button>
          {gallery?.status === "published" && (
            <Button variant="secondary" size="sm" onClick={handleCopyLink}>
              {t.galleries.copyLink}
            </Button>
          )}
          {/* Publish: show when there are staged photos OR draft with existing photos */}
          {(stagedCount > 0 || (gallery?.status === "draft" && photos.length > 0)) && (
            <Button size="sm" loading={publishing} onClick={handlePublish}>
              {t.galleries.publish}{stagedCount > 0 ? ` (${stagedCount})` : ""}
            </Button>
          )}
        </div>
      </div>

      {/* Storage */}
      {storage && (
        <div className="mt-4">
          <StorageBar usedBytes={storage.used_bytes} limitBytes={storage.limit_bytes} />
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t.galleries.settings}
          </h3>
          <div className="space-y-4">
            {/* PIN */}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                {t.galleries.pinLabel}
              </label>
              <input
                type="text"
                value={settingsPin}
                onChange={(e) => setSettingsPin(e.target.value)}
                placeholder={t.galleries.pinPlaceholder}
                className="mt-1 w-full max-w-xs rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
              />
            </div>

            {/* Downloads */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settingsDownload}
                onChange={(e) => setSettingsDownload(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t.galleries.allowDownloads}
              </span>
            </label>

            {/* Selection */}
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settingsSelection}
                onChange={(e) => setSettingsSelection(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t.galleries.allowSelection}
              </span>
            </label>

            {settingsSelection && (
              <div className="ml-7">
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                  {t.galleries.selectionLimit}
                </label>
                <input
                  type="number"
                  min={0}
                  value={settingsSelectionLimit}
                  onChange={(e) => setSettingsSelectionLimit(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-24 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
                <p className="mt-0.5 text-xs text-gray-400">0 = unlimited</p>
              </div>
            )}

            <Button size="sm" onClick={handleSaveSettings}>
              {t.galleries.saveSettings}
            </Button>
          </div>
        </div>
      )}

      {/* Client Picks / Upload toggle */}
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setShowClientPicks(false)}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            !showClientPicks
              ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          Photos & Upload
        </button>
        <button
          onClick={() => { setShowClientPicks(true); fetchClientPicks(); }}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            showClientPicks
              ? "bg-yellow-500 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          Client Picks ♥ {clientPicksCount > 0 ? clientPicksCount : ""}
        </button>
      </div>

      {showClientPicks ? (
        /* Client Picks Tab */
        <div className="mt-6 space-y-4">
          {/* Lock/Unlock + info */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                ♥ {clientPicksCount} photo{clientPicksCount !== 1 ? "s" : ""} selected by client
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectionLocked
                  ? "Selection is locked — client cannot change picks."
                  : "Selection is open — client can still add/remove picks."}
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={lockToggling}
              onClick={handleToggleLock}
            >
              {selectionLocked ? "🔓 Unlock" : "🔒 Lock"}
            </Button>
          </div>

          {/* Download buttons */}
          <BulkDownloadButton
            downloadEndpoint={`/api/v1/galleries/${bookingId}/download-urls?selected_only=true`}
            totalPhotos={clientPicksCount}
            selectedCount={clientPicksCount}
            downloadEnabled={true}
          />

          {/* Client picks grid */}
          {clientPicks.length === 0 ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center dark:border-gray-800 dark:bg-gray-900">
              <span className="text-3xl">♥</span>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                No client selections yet.
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                When your client favourites photos, they will appear here.
              </p>
            </div>
          ) : (
            <PhotoGrid
              photos={clientPicks}
              isManageMode={false}
              onDelete={() => {}}
              onToggleVisibility={() => {}}
              onPhotoClick={(photo) => {
                const idx = clientPicks.findIndex((p) => p.id === photo.id);
                setLightboxIndex(idx);
              }}
            />
          )}
        </div>
      ) : (
      /* Photos & Upload Tab */
      <>
      {/* Upload zone */}
      <div className="mt-6">
        <PhotoUploadZone
          ref={uploadRef}
          bookingId={bookingId}
          onStagedCountChange={setStagedCount}
          onUploadComplete={() => {
            fetchPhotos();
            fetchStorage();
            initGallery();
          }}
        />
      </div>

      {/* Photo grid */}
      <div className="mt-6">
        <PhotoGrid
          photos={photos}
          isManageMode={isManageMode}
          onDelete={handleDeletePhoto}
          onToggleVisibility={handleToggleVisibility}
          onPhotoClick={(photo) => {
            const idx = photos.findIndex((p) => p.id === photo.id);
            setLightboxIndex(idx);
          }}
        />
      </div>

      {/* Download all photos */}
      <div className="mt-4">
        <BulkDownloadButton
          downloadEndpoint={`/api/v1/galleries/${bookingId}/download-urls`}
          totalPhotos={photos.length}
          selectedCount={clientPicksCount}
          downloadEnabled={true}
        />
      </div>
      </>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (showClientPicks ? clientPicks : photos)[lightboxIndex] && (
        <PhotoLightbox
          url={(showClientPicks ? clientPicks : photos)[lightboxIndex].url}
          filename={(showClientPicks ? clientPicks : photos)[lightboxIndex].original_filename}
          onClose={() => setLightboxIndex(null)}
          onPrev={lightboxIndex > 0 ? () => setLightboxIndex(lightboxIndex - 1) : undefined}
          onNext={
            lightboxIndex < (showClientPicks ? clientPicks : photos).length - 1
              ? () => setLightboxIndex(lightboxIndex + 1)
              : undefined
          }
          allowDownload
        />
      )}
    </div>
  );
}
