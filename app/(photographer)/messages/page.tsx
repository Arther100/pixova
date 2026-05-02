// ============================================
// /(photographer)/messages — Client messages inbox
// ============================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";

interface ClientMessage {
  message_id: string;
  booking_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
  client_name: string;
  client_phone: string;
  booking_ref: string | null;
  booking_title: string;
}

export default function MessagesPage() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/messages")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setMessages(json.data?.messages || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markRead(messageId: string) {
    try {
      const res = await fetch(`/api/v1/messages/${messageId}/read`, { method: "PATCH" });
      const json = await res.json();
      if (json.success) {
        setMessages((prev) => prev.map((m) =>
          m.message_id === messageId ? { ...m, is_read: true } : m
        ));
      }
    } catch {
      // Silently fail
    }
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  const unreadCount = messages.filter((m) => !m.is_read).length;

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
          {(t.nav as Record<string, string>).messages || "Messages"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Messages from your clients via their portal.
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {unreadCount} unread
            </span>
          )}
        </p>
      </div>

      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16 dark:border-gray-800 dark:bg-gray-900">
          <span className="text-4xl">💬</span>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No client messages yet.</p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            Messages from your client portals will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.message_id}
              className={`rounded-xl border bg-white p-4 transition-all dark:bg-gray-900 ${
                msg.is_read
                  ? "border-gray-200 dark:border-gray-800"
                  : "border-brand-200 bg-brand-50/50 dark:border-brand-800 dark:bg-brand-950/20"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {msg.client_name}
                    </span>
                    {!msg.is_read && (
                      <span className="h-2 w-2 rounded-full bg-brand-500" />
                    )}
                  </div>
                  <Link
                    href={`/bookings/${msg.booking_id}`}
                    className="text-xs text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {msg.booking_ref ? `${msg.booking_ref} · ` : ""}{msg.booking_title}
                  </Link>
                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                    {msg.message_text}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {timeAgo(msg.created_at)}
                  </span>
                  {!msg.is_read && (
                    <button
                      onClick={() => markRead(msg.message_id)}
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
