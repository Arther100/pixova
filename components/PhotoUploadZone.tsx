// ============================================
// PhotoUploadZone — staging queue + upload
// Files are staged first (preview only).
// Parent calls startUpload() to begin actual R2 uploads.
// ============================================

"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import { useI18n } from "@/lib/i18n";

interface StagedFile {
  id: string;
  file: File;
  preview: string;
  status: "staged" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
}

export interface PhotoUploadZoneRef {
  /** How many files are currently staged (not yet uploaded) */
  stagedCount: number;
  /** Start uploading all staged files. Returns when complete. */
  startUpload: () => Promise<void>;
  /** Whether an upload is currently in progress */
  isUploading: boolean;
}

interface PhotoUploadZoneProps {
  bookingId: string;
  onUploadComplete?: () => void;
  disabled?: boolean;
  /** Called whenever the staged file count changes */
  onStagedCountChange?: (count: number) => void;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const CONCURRENT_UPLOADS = 3;

export const PhotoUploadZone = forwardRef<PhotoUploadZoneRef, PhotoUploadZoneProps>(
  function PhotoUploadZone({ bookingId, onUploadComplete, disabled = false, onStagedCountChange }, ref) {
    const { t } = useI18n();
    const [files, setFiles] = useState<StagedFile[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const uploadingRef = useRef(false);

    // Cleanup preview URLs on unmount
    useEffect(() => {
      return () => {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        files.forEach((f) => URL.revokeObjectURL(f.preview));
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Notify parent when staged count changes
    useEffect(() => {
      const staged = files.filter((f) => f.status === "staged").length;
      onStagedCountChange?.(staged);
    }, [files, onStagedCountChange]);

    const addFiles = useCallback((newFiles: FileList | File[]) => {
      const validFiles: StagedFile[] = [];
      for (const file of Array.from(newFiles)) {
        if (!ALLOWED_TYPES.includes(file.type)) continue;
        if (file.size > MAX_FILE_SIZE) continue;
        validFiles.push({
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          status: "staged",
          progress: 0,
        });
      }
      if (validFiles.length === 0) return;
      setFiles((prev) => [...prev, ...validFiles]);
    }, []);

    const removeFile = useCallback((id: string) => {
      setFiles((prev) => {
        const file = prev.find((f) => f.id === id);
        if (file) URL.revokeObjectURL(file.preview);
        return prev.filter((f) => f.id !== id);
      });
    }, []);

    // Upload all staged files
    const startUpload = useCallback(async () => {
      if (uploadingRef.current) return;
      uploadingRef.current = true;

      const upload = async (uploadFile: StagedFile) => {
        try {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "uploading" as const, progress: 10 } : f
            )
          );

          // 1. Get presigned URL
          const urlRes = await fetch(`/api/v1/galleries/${bookingId}/upload-url`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: uploadFile.file.name,
              content_type: uploadFile.file.type,
              file_size: uploadFile.file.size,
            }),
          });
          const urlJson = await urlRes.json();
          if (!urlRes.ok || !urlJson.success) {
            throw new Error(urlJson.error || "Failed to get upload URL");
          }

          setFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 30 } : f))
          );

          // 2. PUT directly to R2
          const putRes = await fetch(urlJson.data.upload_url, {
            method: "PUT",
            body: uploadFile.file,
            headers: { "Content-Type": uploadFile.file.type },
          });
          if (!putRes.ok) throw new Error("Upload to storage failed");

          setFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, progress: 80 } : f))
          );

          // 3. Confirm upload
          await fetch(`/api/v1/galleries/${bookingId}/confirm-upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              photo_id: urlJson.data.photo_id,
              file_size: uploadFile.file.size,
            }),
          });

          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id ? { ...f, status: "done" as const, progress: 100 } : f
            )
          );
        } catch (err) {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadFile.id
                ? { ...f, status: "error" as const, error: err instanceof Error ? err.message : "Upload failed" }
                : f
            )
          );
        }
      };

      // Process in batches of CONCURRENT_UPLOADS
      while (true) {
        let staged: StagedFile[] = [];
        await new Promise((r) => setTimeout(r, 50));
        setFiles((cur) => {
          staged = cur.filter((f) => f.status === "staged");
          return cur;
        });
        await new Promise((r) => setTimeout(r, 50));

        if (staged.length === 0) break;
        const batch = staged.slice(0, CONCURRENT_UPLOADS);
        await Promise.allSettled(batch.map(upload));
      }

      uploadingRef.current = false;

      // Auto-clear queue after a short delay
      setTimeout(() => {
        setFiles((prev) => {
          prev.forEach((f) => URL.revokeObjectURL(f.preview));
          return [];
        });
        onUploadComplete?.();
      }, 1500);
    }, [bookingId, onUploadComplete]);

    // Expose ref API to parent
    useImperativeHandle(
      ref,
      () => ({
        get stagedCount() {
          return files.filter((f) => f.status === "staged").length;
        },
        startUpload,
        get isUploading() {
          return uploadingRef.current;
        },
      }),
      [files, startUpload]
    );

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        addFiles(e.dataTransfer.files);
      },
      [addFiles, disabled]
    );

    const completedCount = files.filter((f) => f.status === "done").length;
    const errorCount = files.filter((f) => f.status === "error").length;
    const totalCount = files.length;
    const activelyUploading = files.some((f) => f.status === "uploading");
    const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
      <div className="space-y-4">
        {/* Drop zone — always visible when not uploading */}
        {!activelyUploading && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              if (!disabled) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !disabled && inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
              isDragging
                ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                : "border-gray-300 bg-gray-50 hover:border-brand-400 hover:bg-brand-50/50 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-brand-600 dark:hover:bg-brand-900/10"
            } ${disabled ? "pointer-events-none opacity-50" : ""}`}
          >
            <svg className="mb-3 h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
            </svg>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.galleries.dropPhotos}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t.galleries.uploadHint}
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {/* Staged / uploading file grid */}
        {totalCount > 0 && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            {/* Header */}
            <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {activelyUploading ? (
                    <div className="relative flex h-8 w-8 items-center justify-center">
                      <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-200 dark:text-gray-700" />
                        <circle cx="18" cy="18" r="15" fill="none" strokeWidth="2" strokeDasharray={`${overallProgress * 0.942} 94.2`} strokeLinecap="round" className="text-brand-500 transition-all duration-300" stroke="currentColor" />
                      </svg>
                      <span className="absolute text-[8px] font-bold text-brand-600 dark:text-brand-400">{overallProgress}%</span>
                    </div>
                  ) : completedCount > 0 && completedCount === totalCount ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
                      <svg className="h-4 w-4 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
                      <svg className="h-4 w-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {activelyUploading
                        ? `Uploading ${completedCount} of ${totalCount}…`
                        : completedCount === totalCount && completedCount > 0
                        ? `All ${completedCount} uploaded!`
                        : `${files.filter((f) => f.status === "staged").length} photos ready`}
                    </p>
                    {errorCount > 0 && <p className="text-xs text-red-500">{errorCount} failed</p>}
                    {!activelyUploading && files.some((f) => f.status === "staged") && (
                      <p className="text-xs text-gray-400">Click Publish to upload & share</p>
                    )}
                  </div>
                </div>
                {!activelyUploading && files.some((f) => f.status === "staged") && (
                  <button
                    type="button"
                    onClick={() => {
                      files.forEach((f) => URL.revokeObjectURL(f.preview));
                      setFiles([]);
                    }}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    Clear all
                  </button>
                )}
              </div>
              {/* Progress bar — only during upload */}
              {activelyUploading && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Thumbnail grid */}
            <div className="grid grid-cols-6 gap-1 p-2 sm:grid-cols-8 md:grid-cols-10">
              {files.map((f) => (
                <div key={f.id} className="group relative aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.preview}
                    alt={f.file.name}
                    className={`h-full w-full object-cover transition-opacity ${f.status === "done" ? "opacity-100" : f.status === "uploading" ? "opacity-50" : "opacity-90"}`}
                  />

                  {/* Remove button — only for staged files */}
                  {f.status === "staged" && (
                    <button
                      type="button"
                      onClick={() => removeFile(f.id)}
                      className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}

                  {/* Uploading spinner */}
                  {f.status === "uploading" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                  {/* Done checkmark */}
                  {f.status === "done" && (
                    <div className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                  {/* Error */}
                  {f.status === "error" && (
                    <div className="absolute inset-x-0 bottom-0 bg-red-600/80 px-1 py-0.5 text-center">
                      <span className="text-[8px] font-medium text-white">Failed</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
);
