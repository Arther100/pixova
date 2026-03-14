// ============================================
// AgreementPreviewCard — Summary card for agreement
// ============================================

"use client";

import type { AgreementSnapshot } from "@/types";
import { AgreementStatusBadge } from "@/components/AgreementStatusBadge";
import { formatRupees } from "@/utils/currency";
import { formatDate } from "@/utils/date";

interface AgreementPreviewCardProps {
  agreementData: AgreementSnapshot;
  status: string;
}

export function AgreementPreviewCard({ agreementData, status }: AgreementPreviewCardProps) {
  const d = agreementData;

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
          {d.agreement_ref}
        </span>
        <AgreementStatusBadge status={status} />
      </div>

      {/* Body */}
      <div className="space-y-3 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="text-base">📷</span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {d.studio_name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-base">👤</span>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {d.client_name} · {d.client_mobile}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-base">📅</span>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {d.event_type}
            {d.event_date ? ` · ${formatDate(d.event_date)}` : ""}
          </span>
        </div>

        {(d.venue_name || d.venue_city) && (
          <div className="flex items-center gap-2">
            <span className="text-base">📍</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {[d.venue_name, d.venue_city].filter(Boolean).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Financial */}
      <div className="border-t border-gray-100 px-5 py-3 dark:border-gray-800">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Total:</span>
          <span className="text-gray-900 dark:text-gray-100">
            {formatRupees(d.total_amount)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Advance:</span>
          <span className="text-gray-900 dark:text-gray-100">
            {formatRupees(d.advance_paid)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm font-semibold">
          <span className="text-gray-500 dark:text-gray-400">Balance:</span>
          <span className="text-brand-700 dark:text-brand-400">
            {formatRupees(d.balance_amount)}
          </span>
        </div>
      </div>
    </div>
  );
}
