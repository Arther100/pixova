export const metadata = {
  title: "Clients",
};

export default function ClientsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Clients
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your client contacts and communication.
          </p>
        </div>
        <button className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
          + Add Client
        </button>
      </div>

      {/* Empty state */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-12 text-center">
        <span className="text-5xl">👥</span>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">
          No clients yet
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Add your first client to start managing contacts.
        </p>
      </div>
    </div>
  );
}
