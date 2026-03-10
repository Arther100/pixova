export default function BookingFormLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Breadcrumb */}
      <div className="h-4 w-52 rounded bg-gray-200 dark:bg-gray-800" />
      {/* Title */}
      <div className="h-7 w-44 rounded-lg bg-gray-200 dark:bg-gray-800" />
      {/* Form skeleton */}
      <div className="space-y-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        {/* Section: Client Details */}
        <div>
          <div className="h-5 w-28 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
            <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
          </div>
        </div>
        {/* Section: Event Details */}
        <div>
          <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
            <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
            <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
            <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
          </div>
        </div>
        {/* Section: Pricing */}
        <div>
          <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-800" />
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
            <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
            <div className="h-10 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
          </div>
        </div>
        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
          <div className="h-10 w-20 rounded-xl bg-gray-200 dark:bg-gray-800" />
          <div className="h-10 w-32 rounded-xl bg-gray-200 dark:bg-gray-800" />
        </div>
      </div>
    </div>
  );
}
