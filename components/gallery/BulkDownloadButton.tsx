"use client";

import { useState } from "react";
import JSZip from "jszip";

interface BulkDownloadButtonProps {
  /** API endpoint to fetch download URLs from */
  downloadEndpoint: string;
  totalPhotos: number;
  selectedCount: number;
  downloadEnabled: boolean;
}

export default function BulkDownloadButton({
  downloadEndpoint,
  totalPhotos,
  selectedCount,
  downloadEnabled,
}: BulkDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  if (!downloadEnabled) return null;

  const downloadZip = async (selectedOnly: boolean) => {
    setDownloading(true);
    setProgress(0);

    try {
      setProgressLabel("Preparing download...");
      const res = await fetch(
        `${downloadEndpoint}?selected_only=${selectedOnly}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to prepare download");
      }

      const json = await res.json();
      const { photos, gallery_title } = json.data || json;

      if (!photos || photos.length === 0) {
        throw new Error("No photos to download");
      }

      const zip = new JSZip();
      const folderName = gallery_title || "Photos";
      const folder = zip.folder(folderName)!;

      let completed = 0;
      const batchSize = 5;

      for (let i = 0; i < photos.length; i += batchSize) {
        const batch = photos.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (photo: { filename: string; url: string }) => {
            const response = await fetch(photo.url);
            if (!response.ok) throw new Error(`Failed to fetch ${photo.filename}`);
            const blob = await response.blob();
            folder.file(photo.filename, blob);
            completed++;
            setProgress(Math.round((completed / photos.length) * 85));
            setProgressLabel(`Downloading ${completed} of ${photos.length}...`);
          })
        );
      }

      setProgress(90);
      setProgressLabel("Creating ZIP file...");

      const zipBlob = await zip.generateAsync(
        { type: "blob" },
        (metadata) => {
          setProgress(90 + Math.round(metadata.percent * 0.1));
        }
      );

      setProgress(100);
      setProgressLabel("Done!");

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${folderName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Download failed. Please try again.");
    } finally {
      setTimeout(() => {
        setDownloading(false);
        setProgress(0);
        setProgressLabel("");
      }, 1000);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => downloadZip(false)}
        disabled={downloading}
        className="flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {downloading ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>{progressLabel}</span>
          </>
        ) : (
          <>⬇ Download All ({totalPhotos} photos)</>
        )}
      </button>

      {selectedCount > 0 && (
        <button
          onClick={() => downloadZip(true)}
          disabled={downloading}
          className="flex items-center justify-center gap-2 rounded-lg border border-yellow-400 px-4 py-2.5 text-sm font-medium text-yellow-700 transition-colors hover:bg-yellow-50 disabled:opacity-50"
        >
          ♥ Download Selected ({selectedCount} photos)
        </button>
      )}

      {downloading && progress > 0 && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #DAA520, #FFD700)",
            }}
          />
        </div>
      )}

      {totalPhotos > 200 && !downloading && (
        <p className="text-xs text-amber-600">
          ⚠ Large gallery ({totalPhotos} photos). Download may take a few minutes. Keep this tab open.
        </p>
      )}
    </div>
  );
}
