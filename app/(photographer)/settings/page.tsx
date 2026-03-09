export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900">
        Settings
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Manage your studio profile, subscription, and preferences.
      </p>

      <div className="mt-8 space-y-6">
        {/* Studio Profile */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Studio Profile
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Update your studio name, logo, and contact details.
          </p>
          {/* Form placeholder */}
          <div className="mt-4 text-sm text-gray-400 italic">
            Coming soon...
          </div>
        </div>

        {/* Subscription */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your plan and billing.
          </p>
          <div className="mt-4 text-sm text-gray-400 italic">
            Coming soon...
          </div>
        </div>
      </div>
    </div>
  );
}
