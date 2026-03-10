export default function PaymentsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-7 w-28 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="mt-2 h-4 w-52 rounded bg-gray-100 dark:bg-gray-800/60" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        ))}
      </div>
    </div>
  );
}
