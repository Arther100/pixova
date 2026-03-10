export default function SettingsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-7 w-28 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="mt-2 h-4 w-56 rounded bg-gray-100 dark:bg-gray-800/60" />
      </div>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-3 w-48 rounded bg-gray-100 dark:bg-gray-800/60" />
            </div>
            <div className="h-6 w-11 rounded-full bg-gray-200 dark:bg-gray-800" />
          </div>
        ))}
      </div>
    </div>
  );
}
