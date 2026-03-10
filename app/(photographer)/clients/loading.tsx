export default function ClientsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-7 w-24 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="mt-2 h-4 w-52 rounded bg-gray-100 dark:bg-gray-800/60" />
      </div>
      <div className="h-10 w-full rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-40 rounded bg-gray-100 dark:bg-gray-800/60" />
            </div>
            <div className="h-4 w-20 rounded bg-gray-100 dark:bg-gray-800/60" />
          </div>
        ))}
      </div>
    </div>
  );
}
