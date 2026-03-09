export const metadata = {
  title: "Galleries",
};

export default function GalleriesPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Galleries
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and share photo galleries with your clients via WhatsApp.
          </p>
        </div>
        <button className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
          + New Gallery
        </button>
      </div>

      {/* Empty state */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-12 text-center">
        <span className="text-5xl">🖼️</span>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          No galleries yet
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Create a gallery and upload photos to share with clients.
        </p>
      </div>
    </div>
  );
}
