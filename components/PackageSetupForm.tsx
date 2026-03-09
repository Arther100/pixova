// ============================================
// PackageSetupForm — Add service packages (Step 3 of onboarding)
// ============================================

"use client";

import { useState, useCallback } from "react";
import { Button, Input } from "@/components/ui";

interface PackageData {
  name: string;
  description: string;
  price: string; // rupees display
  deliverables: string;
  durationHours: string;
}

interface PackageSetupFormProps {
  onComplete: (packages: PackageData[]) => void;
  onSkip: () => void;
  loading?: boolean;
}

const STARTER_TEMPLATES: PackageData[] = [
  {
    name: "Basic",
    description: "Perfect for small events and portraits",
    price: "15000",
    deliverables: "50 edited photos, online gallery",
    durationHours: "2",
  },
  {
    name: "Standard",
    description: "Great for full-day events",
    price: "35000",
    deliverables: "200 edited photos, online gallery, 1 album",
    durationHours: "8",
  },
  {
    name: "Premium",
    description: "Complete coverage for weddings and multi-day events",
    price: "75000",
    deliverables: "500+ edited photos, cinematic video, 2 albums, pre-wedding shoot",
    durationHours: "24",
  },
];

const emptyPackage: PackageData = {
  name: "",
  description: "",
  price: "",
  deliverables: "",
  durationHours: "",
};

export function PackageSetupForm({
  onComplete,
  onSkip,
  loading = false,
}: PackageSetupFormProps) {
  const [packages, setPackages] = useState<PackageData[]>([]);
  const [editing, setEditing] = useState<PackageData>(emptyPackage);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showForm, setShowForm] = useState(false);

  // ── Use template ──
  const useTemplates = useCallback(() => {
    setPackages(STARTER_TEMPLATES);
    setShowForm(false);
  }, []);

  // ── Add/Edit package ──
  const openAdd = useCallback(() => {
    setEditing(emptyPackage);
    setEditingIndex(null);
    setErrors({});
    setShowForm(true);
  }, []);

  const openEdit = useCallback(
    (index: number) => {
      setEditing({ ...packages[index] });
      setEditingIndex(index);
      setErrors({});
      setShowForm(true);
    },
    [packages]
  );

  const removePackage = useCallback(
    (index: number) => {
      setPackages((prev) => prev.filter((_, i) => i !== index));
    },
    []
  );

  // ── Validate ──
  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};
    if (!editing.name.trim()) errs.name = "Package name is required";
    if (!editing.price.trim()) errs.price = "Price is required";
    const priceNum = parseInt(editing.price, 10);
    if (isNaN(priceNum) || priceNum < 0) errs.price = "Invalid price";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [editing]);

  // ── Save package ──
  const handleSave = useCallback(() => {
    if (!validate()) return;

    if (editingIndex !== null) {
      setPackages((prev) =>
        prev.map((p, i) => (i === editingIndex ? { ...editing } : p))
      );
    } else {
      setPackages((prev) => [...prev, { ...editing }]);
    }

    setShowForm(false);
    setEditing(emptyPackage);
    setEditingIndex(null);
  }, [editing, editingIndex, validate]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Service Packages
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add your photography packages so clients know what you offer.
          You can always edit these later.
        </p>
      </div>

      {/* Template suggestion */}
      {packages.length === 0 && !showForm && (
        <div className="rounded-xl border-2 border-dashed border-gray-300 p-6 text-center dark:border-gray-600">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Start with our suggested templates or create your own
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button variant="secondary" size="sm" onClick={useTemplates}>
              Use Templates
            </Button>
            <Button size="sm" onClick={openAdd}>
              + Create Package
            </Button>
          </div>
        </div>
      )}

      {/* Package list */}
      {packages.length > 0 && (
        <div className="space-y-3">
          {packages.map((pkg, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{pkg.name}</h4>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                    ₹{parseInt(pkg.price).toLocaleString("en-IN")}
                  </span>
                </div>
                {pkg.description && (
                  <p className="mt-0.5 text-xs text-gray-500 truncate dark:text-gray-400">
                    {pkg.description}
                  </p>
                )}
                {pkg.deliverables && (
                  <p className="mt-0.5 text-xs text-gray-400 truncate">
                    {pkg.deliverables}
                  </p>
                )}
              </div>
              <div className="ml-3 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openEdit(i)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  onClick={() => removePackage(i)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                  title="Remove"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {!showForm && (
            <button
              type="button"
              onClick={openAdd}
              className="w-full rounded-xl border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors dark:border-gray-600 dark:text-gray-400"
            >
              + Add Another Package
            </button>
          )}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4 space-y-3 dark:border-brand-800 dark:bg-brand-900/10">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {editingIndex !== null ? "Edit Package" : "New Package"}
          </h4>

          <Input
            label="Package Name *"
            value={editing.name}
            onChange={(e) =>
              setEditing((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="e.g. Wedding Premium"
            error={errors.name}
          />

          <Input
            label="Description"
            value={editing.description}
            onChange={(e) =>
              setEditing((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="What's included in this package"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price (₹) *
              </label>
              <div className="flex overflow-hidden rounded-xl border border-gray-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500 dark:border-gray-600">
                <span className="flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                  ₹
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editing.price}
                  onChange={(e) =>
                    setEditing((prev) => ({
                      ...prev,
                      price: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  placeholder="25000"
                  className="flex-1 px-3 py-2.5 text-sm outline-none dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
                />
              </div>
              {errors.price && (
                <p className="mt-1 text-xs text-red-500">{errors.price}</p>
              )}
            </div>

            <Input
              label="Duration (hours)"
              type="number"
              value={editing.durationHours}
              onChange={(e) =>
                setEditing((prev) => ({
                  ...prev,
                  durationHours: e.target.value,
                }))
              }
              placeholder="8"
            />
          </div>

          <Input
            label="Deliverables"
            value={editing.deliverables}
            onChange={(e) =>
              setEditing((prev) => ({
                ...prev,
                deliverables: e.target.value,
              }))
            }
            placeholder="200 edited photos, 1 album, online gallery"
          />

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setEditingIndex(null);
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} className="flex-1">
              {editingIndex !== null ? "Update" : "Add Package"}
            </Button>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onSkip} className="flex-1">
          Skip for Now
        </Button>
        <Button
          onClick={() => onComplete(packages)}
          loading={loading}
          disabled={packages.length === 0}
          className="flex-1"
        >
          Complete Setup →
        </Button>
      </div>
    </div>
  );
}
