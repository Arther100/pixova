export default function CalendarLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-28 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="mt-2 h-4 w-44 rounded-lg bg-gray-100 dark:bg-gray-800/60" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
      {/* Main layout */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Calendar skeleton */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div className="h-6 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-6 w-16 rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>
          {/* Day labels */}
          <div className="mb-1 grid grid-cols-7 gap-px">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="py-2 text-center">
                <div className="mx-auto h-3 w-6 rounded bg-gray-200 dark:bg-gray-800" />
              </div>
            ))}
          </div>
          {/* Grid cells */}
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 dark:border-gray-700 dark:bg-gray-700">
            {Array.from({ length: 42 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[52px] bg-white dark:bg-gray-900 sm:min-h-[64px]"
              />
            ))}
          </div>
        </div>
        {/* Sidebar skeleton */}
        <div className="space-y-6">
          <div className="h-40 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50" />
          <div className="h-56 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50" />
        </div>
      </div>
    </div>
  );
}
