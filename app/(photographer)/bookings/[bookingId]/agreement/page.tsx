// ============================================
// /(photographer)/bookings/[bookingId]/agreement — Agreement detail page
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { AgreementPreviewCard } from "@/components/AgreementPreviewCard";
import { AgreementStatusBadge } from "@/components/AgreementStatusBadge";
import { Button } from "@/components/ui";
import { formatDateTime } from "@/utils/date";
import type { AgreementSnapshot } from "@/types";

interface AgreementDetail {
  agreement_id: string;
  agreement_ref: string;
  status: string;
  client_viewed_at: string | null;
  generated_at: string;
  regenerated_at: string | null;
  agreement_data: AgreementSnapshot;
  has_pdf: boolean;
}

export default function AgreementPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const { t } = useI18n();

  const [agreement, setAgreement] = useState<AgreementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showRegenModal, setShowRegenModal] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAgreement = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/agreements?booking_id=${bookingId}`);
      const json = await res.json();
      if (!json.success || !json.data?.agreements?.length) {
        setAgreement(null);
        setLoading(false);
        return;
      }

      const agr = json.data.agreements[0];
      // Fetch full agreement data
      const detailRes = await fetch(`/api/v1/agreements/${agr.agreement_id}`);
      const detailJson = await detailRes.json();
      if (detailJson.success) {
        setAgreement(detailJson.data);
      }
    } catch {
      setError("Failed to load agreement");
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchAgreement();
  }, [fetchAgreement]);

  async function handleDownloadPDF() {
    if (!agreement) return;
    try {
      const res = await fetch(`/api/v1/agreements/${agreement.agreement_id}/pdf`);
      const json = await res.json();
      if (json.success && json.data?.url) {
        window.open(json.data.url, "_blank");
      } else {
        showToast("PDF not available", "error");
      }
    } catch {
      showToast("Failed to download PDF", "error");
    }
  }

  function handleCopyLink() {
    if (!agreement) return;
    const link = `${window.location.origin}/agreement/${agreement.agreement_id}`;
    navigator.clipboard.writeText(link).then(() => {
      showToast(t.agreements.linkCopied, "success");
    });
  }

  async function handleRegenerate() {
    setShowRegenModal(false);
    setRegenerating(true);
    try {
      const res = await fetch(`/api/v1/agreements/generate/${bookingId}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || "Failed to regenerate", "error");
        return;
      }
      showToast(t.agreements.regenerated, "success");
      await fetchAgreement();
    } catch {
      showToast("Failed to regenerate agreement", "error");
    } finally {
      setRegenerating(false);
    }
  }

  function handleWhatsApp() {
    showToast(t.agreements.whatsappSoon, "success");
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-8 w-64 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-64 rounded-xl bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span className="text-4xl">📄</span>
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {error || t.agreements.noAgreement}
        </p>
        <Link href={`/bookings/${bookingId}`} className="mt-4">
          <Button variant="secondary">{t.agreements.backToBooking}</Button>
        </Link>
      </div>
    );
  }

  const canRegenerate = !agreement.client_viewed_at;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg ${
          toast.type === "success"
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/40"
            : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/40"
        }`}>
          <span className={`text-sm font-medium ${
            toast.type === "success"
              ? "text-green-800 dark:text-green-200"
              : "text-red-800 dark:text-red-200"
          }`}>
            {toast.message}
          </span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/bookings" prefetch={true} className="hover:text-brand-600 dark:hover:text-brand-400">
          {t.bookings.title}
        </Link>
        <span>/</span>
        <Link
          href={`/bookings/${bookingId}`}
          prefetch={true}
          className="hover:text-brand-600 dark:hover:text-brand-400"
        >
          {agreement.agreement_data.booking_ref}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{t.agreements.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href={`/bookings/${bookingId}`}
            prefetch={true}
            className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t.agreements.title}
              </h1>
              <AgreementStatusBadge status={agreement.status} />
            </div>
            <p className="mt-1 font-mono text-sm text-gray-500 dark:text-gray-400">
              {agreement.agreement_ref}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mt-6 space-y-6">
        {/* Preview Card */}
        <AgreementPreviewCard
          agreementData={agreement.agreement_data}
          status={agreement.status}
        />

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" size="sm" onClick={handleDownloadPDF}>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t.agreements.downloadPDF}
            </span>
          </Button>

          <Button variant="secondary" size="sm" onClick={handleCopyLink}>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {t.agreements.copyLink}
            </span>
          </Button>

          <Button variant="secondary" size="sm" onClick={handleWhatsApp}>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
              </svg>
              {t.agreements.sendWhatsApp}
            </span>
          </Button>
        </div>

        {/* Client viewed status */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t.agreements.clientViewedAt}:
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {agreement.client_viewed_at
                ? formatDateTime(agreement.client_viewed_at)
                : t.agreements.notYet}
            </span>
          </div>
        </div>

        {/* Regenerate */}
        {canRegenerate && (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-800/50">
            <Button
              variant="secondary"
              size="sm"
              loading={regenerating}
              onClick={() => setShowRegenModal(true)}
            >
              {t.agreements.regenerate}
            </Button>
            <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
              {t.agreements.regenerateHint}
            </p>
          </div>
        )}

        {!canRegenerate && (
          <div className="rounded-xl border border-gray-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {t.agreements.viewedCannotRegenerate}
            </p>
          </div>
        )}
      </div>

      {/* Regenerate Confirmation Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {t.agreements.regenerateTitle}
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t.agreements.regenerateConfirm}
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRegenModal(false)}
              >
                {t.cancel}
              </Button>
              <Button size="sm" onClick={handleRegenerate}>
                {t.agreements.regenerate}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
