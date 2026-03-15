export default function GalleryBookingLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-6 w-48 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-40 rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    </div>
  );
}
