// ============================================
// /(photographer)/settings/cancellation-policy — Cancellation Policy editor
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui";

const MAX_LENGTH = 2000;

export default function CancellationPolicyPage() {
  const { t } = useI18n();
  const [policyText, setPolicyText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPolicy = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/cancellation-policy");
      const json = await res.json();
      if (json.success && json.data.policy_text) {
        setPolicyText(json.data.policy_text);
        setSavedText(json.data.policy_text);
      }
    } catch {
      // non-critical — will use default
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  async function handleSave() {
    if (!policyText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/v1/cancellation-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_text: policyText.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedText(policyText.trim());
        showToast(t.agreements.policySaved, "success");
      } else {
        showToast(json.error || t.error, "error");
      }
    } catch {
      showToast(t.agreements.networkError, "error");
    } finally {
      setSaving(false);
    }
  }

  const isDirty = policyText.trim() !== savedText;
  const charCount = policyText.length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-72 rounded bg-gray-100 dark:bg-gray-800/60" />
        <div className="h-40 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed right-4 top-20 z-50 animate-in slide-in-from-right flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg ${
          toast.type === "success"
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/40"
            : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/40"
        }`}>
          <span className={`text-sm font-medium ${
            toast.type === "success"
              ? "text-green-800 dark:text-green-200"
              : "text-red-800 dark:text-red-200"
          }`}>{toast.message}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/settings" className="hover:text-brand-600 dark:hover:text-brand-400">
          {t.settings.title}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">
          {t.agreements.cancellationPolicy}
        </span>
      </nav>

      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
        {t.agreements.cancellationPolicy}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t.agreements.policyDesc}
      </p>

      {/* Info box */}
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
        <svg className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <p className="text-sm text-amber-700 dark:text-amber-300">
          {t.agreements.policyHint}
        </p>
      </div>

      {/* Textarea */}
      <div className="mt-6">
        <textarea
          value={policyText}
          onChange={(e) => {
            if (e.target.value.length <= MAX_LENGTH) {
              setPolicyText(e.target.value);
            }
          }}
          rows={8}
          placeholder={t.agreements.policyPlaceholder}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm leading-relaxed outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
        />
        <div className="mt-1 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {t.agreements.policyCharHint}
          </p>
          <p className={`text-xs ${
            charCount > MAX_LENGTH * 0.9
              ? "text-amber-500"
              : "text-gray-400 dark:text-gray-500"
          }`}>
            {charCount}/{MAX_LENGTH}
          </p>
        </div>
      </div>

      {/* Save button */}
      <div className="mt-6 flex items-center gap-3">
        <Button
          loading={saving}
          disabled={!isDirty || !policyText.trim()}
          onClick={handleSave}
        >
          {t.save}
        </Button>
        {isDirty && (
          <span className="text-xs text-amber-500">{t.agreements.unsavedChanges}</span>
        )}
      </div>
    </div>
  );
}
