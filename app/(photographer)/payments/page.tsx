export const metadata = {
  title: "Payments",
};

export default function PaymentsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
        Payments
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Track payments, invoices, and subscription billing.
      </p>

      {/* Empty state */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
        <span className="text-5xl">💰</span>
        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          No payments yet
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Payments will appear here once clients make transactions.
        </p>
      </div>
    </div>
  );
}
