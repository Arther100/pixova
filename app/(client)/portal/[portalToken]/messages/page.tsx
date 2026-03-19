"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PortalMessagesPage() {
  const params = useParams();
  const portalToken = params.portalToken as string;

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/portal/me/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message_text: message.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setSent(true);
        setMessage("");
      } else {
        setError(json.error || "Failed to send message");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Link href={`/portal/${portalToken}/overview`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← Back to Overview
      </Link>

      <h1 className="text-lg font-bold text-gray-900">Send a Message</h1>

      <div className="rounded-xl border border-gray-100 bg-blue-50 p-4">
        <p className="text-xs text-blue-700">
          Messages are sent directly to your photographer. They will be notified via WhatsApp.
        </p>
      </div>

      {sent ? (
        <div className="rounded-xl border border-green-100 bg-green-50 p-8 text-center">
          <span className="text-4xl">✅</span>
          <p className="mt-3 text-sm font-medium text-green-700">Message sent!</p>
          <p className="mt-1 text-xs text-green-600">Your photographer has been notified.</p>
          <button
            onClick={() => setSent(false)}
            className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Send another message
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-100 bg-white p-5">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 500))}
              placeholder="Type your message here..."
              rows={5}
              className="w-full resize-none rounded-lg border border-gray-200 p-3 text-sm text-gray-700 placeholder:text-gray-300 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{message.length}/500</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-3">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {sending ? "Sending..." : "Send Message"}
          </button>

          <p className="text-center text-xs text-gray-400">
            You can send up to 5 messages per hour.
          </p>
        </div>
      )}
    </div>
  );
}
