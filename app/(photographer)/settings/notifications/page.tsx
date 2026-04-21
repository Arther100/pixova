// ============================================
// /(photographer)/settings/notifications — Notification preferences
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface Preferences {
  notify_booking_confirmed: boolean;
  notify_payment_received: boolean;
  notify_agreement_ready: boolean;
  notify_gallery_published: boolean;
  notify_payment_link: boolean;
  notify_event_reminder: boolean;
  reminder_hours_before: number;
}

const DEFAULTS: Preferences = {
  notify_booking_confirmed: true,
  notify_payment_received: true,
  notify_agreement_ready: true,
  notify_gallery_published: true,
  notify_payment_link: true,
  notify_event_reminder: true,
  reminder_hours_before: 24,
};

export default function NotificationSettingsPage() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/notifications/preferences");
      const json = await res.json();
      if (json.success && json.data?.preferences) {
        setPrefs({ ...DEFAULTS, ...json.data.preferences });
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  async function handleToggle(key: keyof Preferences, value: boolean) {
    setSaving(key);
    setPrefs((prev) => ({ ...prev, [key]: value }));
    try {
      const res = await fetch("/api/v1/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Preference saved");
      }
    } catch {
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    } finally {
      setSaving(null);
    }
  }

  async function handleReminderHours(hours: number) {
    setSaving("reminder_hours_before");
    setPrefs((prev) => ({ ...prev, reminder_hours_before: hours }));
    try {
      await fetch("/api/v1/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminder_hours_before: hours }),
      });
      showToast("Preference saved");
    } catch {
      // revert
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-72 rounded bg-gray-100 dark:bg-gray-800/60" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-lg dark:border-green-800 dark:bg-green-900/40">
          <span className="text-sm font-medium text-green-800 dark:text-green-200">{toast}</span>
        </div>
      )}

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/settings" className="hover:text-brand-600 dark:hover:text-brand-400">
          {t.settings.title}
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">{t.nav.notifications}</span>
      </nav>

      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
        Notification Settings
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Control which WhatsApp messages are sent automatically.
      </p>

      <div className="mt-8 space-y-6">
        {/* BOOKING NOTIFICATIONS */}
        <SectionTitle title="Booking Notifications" />
        <ToggleCard
          title="Booking Confirmed"
          description="Notify you + client when booking status changes to confirmed"
          checked={prefs.notify_booking_confirmed}
          saving={saving === "notify_booking_confirmed"}
          onChange={(v) => handleToggle("notify_booking_confirmed", v)}
        />

        {/* PAYMENT NOTIFICATIONS */}
        <SectionTitle title="Payment Notifications" />
        <ToggleCard
          title="Payment Received"
          description="Notify you when a payment is recorded"
          checked={prefs.notify_payment_received}
          saving={saving === "notify_payment_received"}
          onChange={(v) => handleToggle("notify_payment_received", v)}
        />
        <ToggleCard
          title="Payment Link Sent"
          description="Send payment link to client via WhatsApp automatically"
          checked={prefs.notify_payment_link}
          saving={saving === "notify_payment_link"}
          onChange={(v) => handleToggle("notify_payment_link", v)}
        />

        {/* DELIVERY NOTIFICATIONS */}
        <SectionTitle title="Delivery Notifications" />
        <ToggleCard
          title="Agreement Ready"
          description="Send agreement link to client when generated"
          checked={prefs.notify_agreement_ready}
          saving={saving === "notify_agreement_ready"}
          onChange={(v) => handleToggle("notify_agreement_ready", v)}
        />
        <ToggleCard
          title="Gallery Published"
          description="Notify client when gallery goes live"
          checked={prefs.notify_gallery_published}
          saving={saving === "notify_gallery_published"}
          onChange={(v) => handleToggle("notify_gallery_published", v)}
        />

        {/* REMINDERS */}
        <SectionTitle title="Reminders" />
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Event Reminder
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Send reminder to you + client before event
              </p>
            </div>
            <Toggle
              checked={prefs.notify_event_reminder}
              saving={saving === "notify_event_reminder"}
              onChange={(v) => handleToggle("notify_event_reminder", v)}
            />
          </div>
          {prefs.notify_event_reminder && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Hours before:</span>
              <select
                value={prefs.reminder_hours_before}
                onChange={(e) => handleReminderHours(parseInt(e.target.value, 10))}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <div className="flex gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
            </svg>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Notifications are sent via WhatsApp using your verified business number.
              Message templates are managed in Meta Business Platform.
            </p>
          </div>
        </div>

        {/* View Log link */}
        <Link
          href="/settings/notifications/log"
          className="block rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-brand-200 hover:bg-brand-50/30 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-brand-800 dark:hover:bg-brand-900/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Notification Log
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                View all sent and failed notification history
              </p>
            </div>
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────

function SectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
      {title}
    </h2>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  saving,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  saving: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
        <Toggle checked={checked} saving={saving} onChange={onChange} />
      </div>
    </div>
  );
}

function Toggle({
  checked,
  saving,
  onChange,
}: {
  checked: boolean;
  saving: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={saving}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 ${
        checked ? "bg-brand-600" : "bg-gray-200 dark:bg-gray-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
