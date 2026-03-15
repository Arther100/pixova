// ============================================
// PhotoGrid — displays gallery photos in a grid
// with select/delete actions
// ============================================

"use client";

import { useState } from "react";

interface Photo {
  id: string;
  url: string;
  thumbnail_url: string | null;
  original_filename: string;
  sort_order: number;
  is_selected?: boolean;
  client_visible?: boolean;
}

interface PhotoGridProps {
  photos: Photo[];
  onDelete?: (photoId: string) => void;
  onToggleVisibility?: (photoId: string, visible: boolean) => void;
  onPhotoClick?: (photo: Photo) => void;
  isManageMode?: boolean;
}

export function PhotoGrid({
  photos,
  onDelete,
  onToggleVisibility,
  onPhotoClick,
  isManageMode = false,
}: PhotoGridProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
        <span className="text-5xl">📷</span>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          No photos uploaded yet
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Bulk actions bar */}
      {isManageMode && selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 dark:border-brand-800 dark:bg-brand-900/30">
          <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
            {selectedIds.size} selected
          </span>
          <div className="flex gap-2">
            {onDelete && (
              <button
                onClick={() => {
                  selectedIds.forEach((id) => onDelete(id));
                  setSelectedIds(new Set());
                }}
                className="rounded-lg bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
              >
                Delete ({selectedIds.size})
              </button>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {photos.map((photo) => {
          const isSelected = selectedIds.has(photo.id);
          const imgSrc = photo.thumbnail_url || photo.url;

          return (
            <div
              key={photo.id}
              className={`group relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800 ${
                isSelected
                  ? "ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-gray-900"
                  : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgSrc}
                alt={photo.original_filename}
                className="h-full w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
                loading="lazy"
                onClick={() =>
                  isManageMode ? toggleSelect(photo.id) : onPhotoClick?.(photo)
                }
              />

              {/* Overlay controls */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

              {/* Select checkbox (manage mode) */}
              {isManageMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelect(photo.id);
                  }}
                  className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                    isSelected
                      ? "border-brand-500 bg-brand-500 text-white"
                      : "border-white/80 bg-black/30 text-transparent hover:border-white"
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              )}

              {/* Visibility toggle */}
              {isManageMode && onToggleVisibility && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(photo.id, !photo.client_visible);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/40 p-1 text-white opacity-0 transition-opacity hover:bg-black/60 group-hover:opacity-100"
                  title={
                    photo.client_visible !== false
                      ? "Hide from client"
                      : "Show to client"
                  }
                >
                  {photo.client_visible !== false ? (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  ) : (
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  )}
                </button>
              )}

              {/* Hidden badge when not visible to client */}
              {photo.client_visible === false && (
                <div className="absolute bottom-2 left-2 rounded bg-gray-900/70 px-1.5 py-0.5 text-[10px] font-medium text-gray-300">
                  Hidden
                </div>
              )}

              {/* Delete button (manage mode, single) */}
              {isManageMode && onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(photo.id);
                  }}
                  className="absolute bottom-2 right-2 rounded-full bg-red-600/80 p-1 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                  title="Delete photo"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
