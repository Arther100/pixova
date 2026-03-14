// ============================================
// AgreementViewer — HTML rendering of agreement for client page
// Styled to look like the PDF but with Tailwind for mobile
// ============================================

"use client";

import type { AgreementSnapshot } from "@/types";
import { formatRupees } from "@/utils/currency";

interface AgreementViewerProps {
  agreementData: AgreementSnapshot;
}

function formatDateLong(dateStr: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(dateStr));
}

function formatGenDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(dateStr));
}

const TERMS = [
  "The photographer will deliver the agreed deliverables within the timeline discussed.",
  "Raw/unedited files are not included unless explicitly agreed in writing.",
  "A copy of edited photographs will be delivered via the Pixova platform gallery link.",
  "The client grants the photographer permission to use select images for portfolio purposes unless opted out in writing.",
  "Force majeure: Neither party is liable for events beyond reasonable control (natural disasters, illness, etc.). Alternate arrangements will be made in good faith.",
];

export function AgreementViewer({ agreementData: d }: AgreementViewerProps) {
  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-wider text-[#0D1B3E]">
            PIXOVA
          </h1>
          <p className="text-xs text-gray-400">pixova.in</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-[#0D1B3E]">
            PHOTOGRAPHY AGREEMENT
          </p>
          <p className="text-xs text-gray-400">{d.agreement_ref}</p>
          <p className="text-xs text-gray-400">{formatGenDate(d.generated_at)}</p>
        </div>
      </div>

      <div className="my-4 h-[1.5px] bg-[#DAA520]" />

      {/* Parties */}
      <SectionTitle>Parties to this Agreement</SectionTitle>
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-400">
            Studio / Photographer
          </p>
          <p className="text-sm font-bold text-[#0D1B3E]">{d.studio_name}</p>
          {d.studio_address && (
            <p className="text-xs text-gray-600">{d.studio_address}</p>
          )}
          <p className="text-xs text-gray-600">{d.studio_city}</p>
          {d.studio_mobile && (
            <p className="text-xs text-gray-600">{d.studio_mobile}</p>
          )}
          {d.gstin && (
            <p className="text-xs text-gray-600">GSTIN: {d.gstin}</p>
          )}
        </div>
        <div>
          <p className="mb-1 text-[10px] uppercase tracking-widest text-gray-400">
            Client
          </p>
          <p className="text-sm font-bold text-[#0D1B3E]">{d.client_name}</p>
          <p className="text-xs text-gray-600">{d.client_mobile}</p>
          {d.client_email && (
            <p className="text-xs text-gray-600">{d.client_email}</p>
          )}
        </div>
      </div>

      {/* Event Details */}
      <SectionTitle>Event Details</SectionTitle>
      <div className="divide-y divide-gray-100">
        <DetailRow label="Booking Reference" value={d.booking_ref} />
        <DetailRow label="Event Type" value={d.event_type} />
        <DetailRow
          label="Event Date"
          value={d.event_date ? formatDateLong(d.event_date) : "—"}
        />
        <DetailRow
          label="End Date"
          value={d.event_end_date ? formatDateLong(d.event_end_date) : "—"}
        />
        <DetailRow
          label="Venue"
          value={
            [d.venue_name, d.venue_city].filter(Boolean).join(", ") || "—"
          }
        />
      </div>

      {/* Package & Pricing */}
      <SectionTitle>Package &amp; Pricing</SectionTitle>
      {d.package_name && (
        <div className="mb-3">
          <p className="text-sm font-bold text-[#0D1B3E]">{d.package_name}</p>
          {d.package_inclusions && (
            <p className="text-xs text-gray-400">{d.package_inclusions}</p>
          )}
        </div>
      )}
      <div className="divide-y divide-gray-100">
        <DetailRow label="Total Amount" value={formatRupees(d.total_amount)} />
        <DetailRow label="Advance Paid" value={formatRupees(d.advance_paid)} />
      </div>
      <div className="mt-1 flex items-center justify-between rounded bg-[#0D1B3E] px-4 py-2.5 border-l-[3px] border-[#DAA520]">
        <span className="text-xs font-bold text-white">Balance Due</span>
        <span className="text-xs font-bold text-white">
          {formatRupees(d.balance_amount)}
        </span>
      </div>

      {/* Terms */}
      <SectionTitle>Terms &amp; Conditions</SectionTitle>
      <ol className="list-decimal space-y-1.5 pl-4">
        {TERMS.map((term, i) => (
          <li key={i} className="text-xs text-gray-700">
            {term}
          </li>
        ))}
      </ol>

      {/* Cancellation Policy */}
      <SectionTitle>Cancellation Policy</SectionTitle>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
        {d.cancellation_policy}
      </p>

      {/* Notes */}
      {d.notes && (
        <>
          <SectionTitle>Additional Notes</SectionTitle>
          <p className="whitespace-pre-wrap text-xs text-gray-700">
            {d.notes}
          </p>
        </>
      )}

      {/* Acknowledgement */}
      <div className="my-6 h-[1.5px] bg-[#DAA520]" />
      <p className="text-center text-[11px] text-gray-400">
        This agreement has been generated via the Pixova platform. By proceeding
        with this booking, both parties confirm they have read and agree to the
        terms outlined above.
      </p>

      {/* Signatures */}
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div>
          <p className="mb-6 text-xs font-bold text-[#0D1B3E]">
            Photographer Signature
          </p>
          <div className="border-b border-gray-200" />
          <p className="mt-1 text-xs text-gray-700">{d.studio_name}</p>
          <p className="mt-2 text-[10px] text-gray-400">
            Date: ___________
          </p>
        </div>
        <div>
          <p className="mb-6 text-xs font-bold text-[#0D1B3E]">
            Client Signature
          </p>
          <div className="border-b border-gray-200" />
          <p className="mt-1 text-xs text-gray-700">{d.client_name}</p>
          <p className="mt-2 text-[10px] text-gray-400">
            Date: ___________
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-6 mb-2 border-b border-[#DAA520] pb-1 text-[10px] font-bold uppercase tracking-[1.5px] text-[#0D1B3E]">
      {children}
    </h3>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs text-gray-700">{value}</span>
    </div>
  );
}
