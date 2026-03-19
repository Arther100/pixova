// ============================================
// /(photographer)/settings/notifications/log — Notification log
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui";

interface NotificationEntry {
  notification_id: string;
  booking_id: string | null;
  recipient_mobile: string;
  recipient_type: string;
  campaign_name: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export default function NotificationLogPage() {
  const { t } = useI18n();
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      const res = await fetch(`/api/v1/notifications?${params}`);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data?.notifications || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function campaignLabel(name: string): string {
    const labels: Record<string, string> = {
      booking_confirmed_client: "Booking Confirmed (Client)",
      booking_confirmed_photographer: "Booking Confirmed (You)",
      payment_received: "Payment Received",
      agreement_ready: "Agreement Ready",
      gallery_published: "Gallery Published",
      payment_link_sent: "Payment Link Sent",
      event_reminder_client: "Event Reminder (Client)",
      event_reminder_photographer: "Event Reminder (You)",
    };
    return labels[name] || name.replace(/_/g, " ");
  }

  const filters = ["ALL", "SENT", "FAILED"];

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/settings" className="hover:text-brand-600 dark:hover:text-brand-400">
          {t.settings.title}
        </Link>
        <span>/</span>
        <Link href="/settings/notifications" className="hover:text-brand-600 dark:hover:text-brand-400">
          Notifications
        </Link>
        <span>/</span>
        <span className="text-gray-900 dark:text-gray-100">Log</span>
      </nav>

      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
        Notification Log
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        View all WhatsApp notifications sent from your studio.
      </p>

      {/* Filters */}
      <div className="mt-6 flex gap-2">
        {filters.map((f) => (
          <Button
            key={f}
            variant={statusFilter === f ? "primary" : "secondary"}
            size="sm"
            onClick={() => setStatusFilter(f)}
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="mt-6">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="text-4xl">📭</span>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              No notifications sent yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.notification_id}
                className={`rounded-xl border p-4 transition-colors ${
                  n.status === "FAILED"
                    ? "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/10"
                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{n.status === "SENT" ? "✅" : n.status === "FAILED" ? "❌" : "⏳"}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {campaignLabel(n.campaign_name)}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          n.recipient_type === "CLIENT"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                        }`}>
                          {n.recipient_type === "CLIENT" ? "Client" : "You"}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span>{n.recipient_mobile}</span>
                        <span>{formatTime(n.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  {n.status === "FAILED" && n.error_message && (
                    <button
                      onClick={() => setExpandedId(expandedId === n.notification_id ? null : n.notification_id)}
                      className="text-xs text-red-600 hover:underline dark:text-red-400"
                    >
                      {expandedId === n.notification_id ? "Hide" : "Details"}
                    </button>
                  )}
                </div>
                {expandedId === n.notification_id && n.error_message && (
                  <div className="mt-2 rounded-lg bg-red-100 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {n.error_message}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
