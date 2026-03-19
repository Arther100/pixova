"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  receipt_number: string | null;
  payment_date: string;
  status: string;
  payment_type: string;
  notes: string | null;
}

interface PaymentSummary {
  total_amount: number;
  total_paid: number;
  balance_due: number;
}

export default function PortalPaymentsPage() {
  const params = useParams();
  const portalToken = params.portalToken as string;
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/portal/me/payments")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setPayments(json.data.payments || []);
          setSummary(json.data.summary || null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amt: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amt);

  const methodLabel: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    razorpay: "Razorpay",
    cheque: "Cheque",
    other: "Other",
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-28 rounded bg-gray-100" />
        <div className="h-24 rounded-xl bg-gray-50" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href={`/portal/${portalToken}/overview`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        ← Back to Overview
      </Link>

      <h1 className="text-lg font-bold text-gray-900">Payments</h1>

      {/* Summary card */}
      {summary && (
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(summary.total_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Paid</p>
              <p className="text-sm font-bold text-green-600">{formatCurrency(summary.total_paid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Balance</p>
              <p className={`text-sm font-bold ${summary.balance_due > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(summary.balance_due)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment history */}
      {payments.length === 0 ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center">
          <span className="text-4xl">💳</span>
          <p className="mt-3 text-sm text-gray-500">No payments recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-100 bg-white p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-gray-500">
                    {methodLabel[p.method] || p.method}
                    {p.receipt_number && ` · ${p.receipt_number}`}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.status === "received" ? "bg-green-50 text-green-700" :
                    p.status === "pending" ? "bg-yellow-50 text-yellow-700" :
                    "bg-gray-50 text-gray-600"
                  }`}>
                    {p.status === "received" ? "Received" : p.status === "pending" ? "Pending" : p.status}
                  </span>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {new Date(p.payment_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              {p.notes && <p className="mt-1.5 text-xs text-gray-400">{p.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
