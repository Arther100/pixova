export default function NotificationLogLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-72 rounded bg-gray-100 dark:bg-gray-800/60" />
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-8 w-16 rounded-lg bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-16 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
      ))}
    </div>
  );
}
