export default function BookingsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-32 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="mt-2 h-4 w-56 rounded-lg bg-gray-100 dark:bg-gray-800/60" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        ))}
      </div>
      {/* Filters bar */}
      <div className="flex gap-3">
        <div className="h-10 flex-1 rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-36 rounded-xl bg-gray-200 dark:bg-gray-800" />
        <div className="h-10 w-40 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
      {/* Card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-44 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        ))}
      </div>
    </div>
  );
}
