export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Greeting */}
      <div>
        <div className="h-8 w-56 rounded-lg bg-gray-200 dark:bg-gray-800" />
        <div className="mt-2 h-4 w-72 rounded-lg bg-gray-100 dark:bg-gray-800/60" />
      </div>
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        ))}
      </div>
      {/* Profile completion + quick actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-32 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        <div className="h-32 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
      </div>
    </div>
  );
}
