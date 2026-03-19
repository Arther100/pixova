export default function NotificationsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-7 w-48 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-72 rounded bg-gray-100 dark:bg-gray-800/60" />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-20 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
      ))}
    </div>
  );
}
