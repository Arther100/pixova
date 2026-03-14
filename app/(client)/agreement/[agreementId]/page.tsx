// ============================================
// /(client)/agreement/[agreementId] — Public agreement view
// Client sees HTML version + download PDF button
// ============================================

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AgreementViewer } from "@/components/AgreementViewer";
import type { AgreementSnapshot } from "@/types";

interface AgreementData {
  agreement_id: string;
  agreement_ref: string;
  status: string;
  agreement_data: AgreementSnapshot;
  has_pdf: boolean;
}

export default function ClientAgreementPage() {
  const params = useParams();
  const agreementId = params.agreementId as string;

  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/agreements/${agreementId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setAgreement(json.data);
          // Mark as viewed (lightweight PATCH, no PDF generation)
          if (!json.data.client_viewed_at) {
            fetch(`/api/v1/agreements/${agreementId}`, { method: "PATCH" }).catch(() => {});
          }
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [agreementId]);

  async function handleDownload() {
    try {
      const res = await fetch(`/api/v1/agreements/${agreementId}/pdf`);
      const json = await res.json();
      if (json.success && json.data?.url) {
        window.open(json.data.url, "_blank");
      }
    } catch {
      // silent
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#0D1B3E]" />
      </div>
    );
  }

  if (error || !agreement) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <span className="text-5xl">📄</span>
        <h1 className="mt-4 text-lg font-semibold text-gray-900">
          Agreement not found
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          This agreement link may have expired or is invalid.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold tracking-wider text-[#0D1B3E]">
              PIXOVA
            </h1>
            <p className="text-[10px] text-gray-400">Photography Agreement</p>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg bg-[#0D1B3E] px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1a2d5c]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PDF
          </button>
        </div>
      </header>

      {/* Agreement content */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        <AgreementViewer agreementData={agreement.agreement_data} />
      </main>

      {/* Bottom download */}
      <div className="border-t border-gray-100 bg-gray-50 py-6 text-center">
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0D1B3E] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#1a2d5c]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PDF
        </button>
      </div>
    </div>
  );
}
