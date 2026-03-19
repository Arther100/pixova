"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PortalEntryPage() {
  const params = useParams();
  const router = useRouter();
  const portalToken = params.portalToken as string;
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/portal/${portalToken}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          router.replace(`/portal/${portalToken}/overview`);
        } else {
          setError(json.error || "This link is invalid or expired.");
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Network error. Please try again.");
        setLoading(false);
      });
  }, [portalToken, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <span className="text-5xl">🔒</span>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Invalid Link</h2>
          <p className="mt-2 text-sm text-gray-500">{error}</p>
          <p className="mt-4 text-xs text-gray-400">Contact your photographer for a new link.</p>
        </div>
      </div>
    );
  }

  return null;
}
