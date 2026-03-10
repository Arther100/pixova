export default function BookingDetailLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Breadcrumb */}
      <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-800" />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div>
            <div className="h-7 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="mt-2 h-4 w-64 rounded bg-gray-100 dark:bg-gray-800/60" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-16 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="h-9 w-20 rounded-lg bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
      {/* Timeline */}
      <div className="h-16 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
      {/* Content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-48 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
          <div className="h-32 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        </div>
        <div className="h-64 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
      </div>
    </div>
  );
}
