"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatRupees } from "@/utils/currency";
import { formatDate } from "@/utils/date";

interface PortalData {
  booking: {
    booking_ref: string;
    status: string;
    event_type: string | null;
    event_date: string | null;
    event_end_date: string | null;
    venue: string | null;
    city: string | null;
    total_amount: number;
    advance_amount: number;
    paid_amount: number;
    balance_amount: number;
    payment_status: string | null;
  };
  client: { name: string; phone: string; email: string | null };
  studio: { name: string; city: string | null; phone: string | null };
  has_agreement: boolean;
  has_gallery: boolean;
  has_feedback: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  enquiry: "Enquiry",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  delivered: "Delivered",
  completed: "Completed",
};

export default function PortalOverviewPage() {
  const params = useParams();
  const portalToken = params.portalToken as string;
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/portal/${portalToken}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setData(json.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [portalToken]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-48 rounded bg-gray-100" />
        <div className="h-32 rounded-xl bg-gray-50" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-gray-50" />)}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { booking, client, studio } = data;
  const canFeedback = ["delivered", "completed"].includes(booking.status);

  const quickLinks = [
    { key: "agreement", label: "Agreement", icon: "📄", disabled: !data.has_agreement, disabledText: "Not ready" },
    { key: "gallery", label: "Gallery", icon: "🖼️", disabled: !data.has_gallery, disabledText: "Not ready" },
    { key: "payments", label: "Payments", icon: "💳", disabled: false, disabledText: "" },
    { key: "feedback", label: "Feedback", icon: "⭐", disabled: !canFeedback, disabledText: "After delivery" },
    { key: "messages", label: "Message", icon: "💬", disabled: false, disabledText: "" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">
          Hi {client.name.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-gray-500">
          {studio.name}{studio.city ? ` · ${studio.city}` : ""}
        </p>
      </div>

      {/* Booking card */}
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">{booking.event_type || "Booking"}</p>
            {booking.event_date && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                📅 {formatDate(booking.event_date)}
              </p>
            )}
            {booking.venue && (
              <p className="flex items-center gap-1.5 text-sm text-gray-600">
                📍 {booking.venue}{booking.city ? `, ${booking.city}` : ""}
              </p>
            )}
            {booking.booking_ref && (
              <p className="mt-1 font-mono text-xs text-gray-400">Ref: {booking.booking_ref}</p>
            )}
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            booking.status === "completed" ? "bg-green-50 text-green-700" :
            booking.status === "delivered" ? "bg-blue-50 text-blue-700" :
            booking.status === "in_progress" ? "bg-yellow-50 text-yellow-700" :
            booking.status === "confirmed" ? "bg-purple-50 text-purple-700" :
            "bg-gray-100 text-gray-600"
          }`}>
            {STATUS_LABELS[booking.status] || booking.status}
          </span>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Quick Links</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickLinks.map((link) => (
            link.disabled ? (
              <div
                key={link.key}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-gray-50 p-3 opacity-40"
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="mt-1 text-xs font-medium text-gray-500">{link.label}</span>
                <span className="text-[10px] text-gray-400">{link.disabledText}</span>
              </div>
            ) : (
              <Link
                key={link.key}
                href={`/portal/${portalToken}/${link.key}`}
                className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-3 transition-colors hover:border-brand-200 hover:bg-brand-50"
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="mt-1 text-xs font-medium text-gray-700">{link.label}</span>
              </Link>
            )
          ))}
        </div>
      </div>

      {/* Payment summary */}
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment Summary</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Total</span>
            <span className="font-medium text-gray-900">{formatRupees(booking.total_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Paid</span>
            <span className="text-green-600">{formatRupees(booking.paid_amount)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2">
            <span className="font-medium text-gray-700">Balance</span>
            <span className={`font-bold ${booking.balance_amount > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatRupees(booking.balance_amount)}
            </span>
          </div>
        </div>
      </div>

      {/* Contact */}
      {studio.phone && (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-500">Need help? Contact {studio.name}</p>
          <a
            href={`https://wa.me/91${studio.phone.replace(/\D/g, '').slice(-10)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            💬 WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
