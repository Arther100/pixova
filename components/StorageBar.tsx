// ============================================
// StorageBar — shows R2 storage usage
// ============================================

"use client";

import { formatBytes } from "@/utils/helpers";

interface StorageBarProps {
  usedBytes: number;
  limitBytes: number;
}

export function StorageBar({ usedBytes, limitBytes }: StorageBarProps) {
  const percent = limitBytes > 0 ? Math.min((usedBytes / limitBytes) * 100, 100) : 0;
  const isWarning = percent >= 80;
  const isCritical = percent >= 95;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Storage
        </span>
        <span className="text-gray-500 dark:text-gray-400">
          {formatBytes(usedBytes)} / {formatBytes(limitBytes)}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all ${
            isCritical
              ? "bg-red-500"
              : isWarning
              ? "bg-amber-500"
              : "bg-brand-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {isCritical && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
          Storage almost full. Delete unused photos or upgrade your plan.
        </p>
      )}
    </div>
  );
}
