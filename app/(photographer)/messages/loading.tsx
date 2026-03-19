export default function MessagesLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
        ))}
      </div>
    </div>
  );
}
