export default function GalleriesLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-28 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="mt-2 h-4 w-52 rounded bg-gray-100 dark:bg-gray-800/60" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="aspect-video bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-2 p-4">
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800/60" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
