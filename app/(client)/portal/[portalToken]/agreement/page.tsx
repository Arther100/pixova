"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface AgreementData {
  agreement_id: string;
  agreement_ref: string;
  agreement_data: Record<string, unknown>;
  pdf_url: string | null;
  status: string;
  generated_at: string;
}

export default function PortalAgreementPage() {
  const params = useParams();
  const portalToken = params.portalToken as string;
  const [agreement, setAgreement] = useState<AgreementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/portal/me/agreement")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAgreement(json.data.agreement);
        else setError(json.error || "Agreement not found");
      })
      .catch(() => setError("Failed to load agreement"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-32 rounded bg-gray-100" />
        <div className="h-64 rounded-xl bg-gray-50" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={`/portal/${portalToken}/overview`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← Back to Overview
      </Link>

      <h1 className="text-lg font-bold text-gray-900">Agreement</h1>

      {error || !agreement ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center">
          <span className="text-4xl">📄</span>
          <p className="mt-3 text-sm text-gray-500">{error || "No agreement found."}</p>
          <p className="mt-1 text-xs text-gray-400">Your agreement will appear here once generated.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Agreement content rendered from agreement_data */}
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-mono text-xs text-gray-400">{agreement.agreement_ref}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                agreement.status === "SIGNED" ? "bg-green-50 text-green-700" :
                agreement.status === "GENERATED" ? "bg-blue-50 text-blue-700" :
                "bg-gray-50 text-gray-600"
              }`}>
                {agreement.status}
              </span>
            </div>

            {/* Render agreement snapshot data */}
            {agreement.agreement_data && (
              <div className="space-y-3 text-sm text-gray-700">
                {Object.entries(agreement.agreement_data as Record<string, unknown>).map(([key, value]) => {
                  if (!value || key.startsWith('_')) return null;
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                  return (
                    <div key={key}>
                      <p className="text-xs font-medium text-gray-400">{label}</p>
                      <p className="mt-0.5">{String(value)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Download PDF */}
          {agreement.pdf_url && (
            <a
              href={`/api/v1/agreements/${agreement.agreement_id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            >
              📥 Download PDF
            </a>
          )}
        </div>
      )}
    </div>
  );
}
