export default function PhotographerLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 rounded-lg bg-gray-200 dark:bg-gray-800" />
          <div className="mt-2 h-4 w-64 rounded-lg bg-gray-100 dark:bg-gray-800/60" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        ))}
      </div>
    </div>
  );
}
