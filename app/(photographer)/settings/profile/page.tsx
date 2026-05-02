// ============================================
// /(photographer)/settings/profile — Studio profile editor
// ============================================

"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui";

const SPECIALIZATIONS = [
  "Wedding",
  "Pre-Wedding",
  "Portrait",
  "Corporate",
  "Fashion",
  "Newborn",
  "Event",
  "Product",
  "Architecture",
  "Wildlife",
];

const LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
];

interface StudioProfile {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  bio: string | null;
  phone: string;
  email: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstin: string | null;
  specializations: string[];
  languages: string[];
  starting_price: number | null;
  is_listed: boolean;
  years_experience: number | null;
  instagram: string | null;
  website: string | null;
  cover_url: string | null;
  profile_complete: boolean;
  package_count?: number;
  portfolio_count?: number;
}

export default function SettingsProfilePage() {
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [gstin, setGstin] = useState("");
  const [selectedSpecs, setSelectedSpecs] = useState<string[]>([]);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [startingPrice, setStartingPrice] = useState("");
  const [isListed, setIsListed] = useState(true);
  const [yearsExperience, setYearsExperience] = useState("");
  const [instagram, setInstagram] = useState("");
  const [website, setWebsite] = useState("");

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/settings/profile");
      const json = await res.json();
      if (json.success && json.data?.profile) {
        const p: StudioProfile = json.data.profile;
        setProfile(p);
        setName(p.name || "");
        setTagline(p.tagline || "");
        setBio(p.bio || "");
        setCity(p.city || "");
        setState(p.state || "");
        setPincode(p.pincode || "");
        setGstin(p.gstin || "");
        setSelectedSpecs(p.specializations || []);
        setSelectedLangs(p.languages || []);
        setStartingPrice(p.starting_price != null ? String(p.starting_price) : "");
        setIsListed(p.is_listed ?? true);
        setYearsExperience(p.years_experience != null ? String(p.years_experience) : "");
        setInstagram(p.instagram || "");
        setWebsite(p.website || "");
      }
    } catch {
      showToast("error", "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const toggleSpec = (s: string) => {
    setSelectedSpecs((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 10 ? [...prev, s] : prev
    );
  };

  const toggleLang = (l: string) => {
    setSelectedLangs((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : prev.length < 10 ? [...prev, l] : prev
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showToast("error", "Studio name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/v1/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          tagline: tagline.trim() || null,
          bio: bio.trim() || null,
          city: city.trim() || null,
          state: state.trim() || null,
          pincode: pincode.trim() || null,
          gstin: gstin.trim() || null,
          specializations: selectedSpecs,
          languages: selectedLangs,
          starting_price: startingPrice ? Number(startingPrice) : null,
          is_listed: isListed,
          years_experience: yearsExperience ? Number(yearsExperience) : null,
          instagram: instagram.trim() || null,
          website: website.trim() || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Profile saved successfully");
        if (json.data?.profile) {
          setProfile(json.data.profile);
        }
      } else {
        showToast("error", json.error || "Failed to save profile");
      }
    } catch {
      showToast("error", "Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 dark:bg-gray-800/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-4 top-20 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/40"
              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/40"
          }`}
        >
          <span
            className={`text-sm font-medium ${
              toast.type === "success"
                ? "text-green-800 dark:text-green-200"
                : "text-red-800 dark:text-red-200"
            }`}
          >
            {toast.text}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Studio Profile
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {profile?.slug && (
              <span className="font-mono text-xs text-brand-600 dark:text-brand-400">
                pixova.in/{profile.slug}
              </span>
            )}
          </p>
          {profile?.slug && (
            <a
              href={`/${profile.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 dark:text-gray-400"
            >
              Preview Public Profile ↗
            </a>
          )}
        </div>
        <Button onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </div>

      {/* Visibility toggle */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Public Listing
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Allow clients to find your studio in search results
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isListed}
            onClick={() => setIsListed((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
              isListed ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isListed ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </label>
      </div>

      {/* Basic Info */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Basic Information
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Studio Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Tagline
              <span className="ml-1 text-gray-400">(max 200 chars)</span>
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={200}
              placeholder="e.g. Capturing love stories since 2018"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Bio
              <span className="ml-1 text-gray-400">(max 2000 chars)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Tell clients about your photography style and experience..."
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-700"
            />
            <p className="mt-0.5 text-right text-xs text-gray-400">{bio.length}/2000</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Starting Price (₹)
            </label>
            <input
              type="number"
              value={startingPrice}
              onChange={(e) => setStartingPrice(e.target.value)}
              min={0}
              placeholder="e.g. 25000"
              className="mt-1 w-40 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Location
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={100}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              State
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value)}
              maxLength={100}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Pincode
            </label>
            <input
              type="text"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              placeholder="6-digit pincode"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* GSTIN */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          GST Details
        </h2>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
            GSTIN <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={gstin}
            onChange={(e) => setGstin(e.target.value.toUpperCase())}
            maxLength={15}
            placeholder="22AAAAA0000A1Z5"
            className="mt-1 w-full max-w-xs rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-700"
          />
        </div>
      </div>

      {/* Specializations */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Specializations
        </h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Select up to 10 · {selectedSpecs.length}/10 selected
        </p>
        <div className="flex flex-wrap gap-2">
          {SPECIALIZATIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSpec(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedSpecs.includes(s)
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Languages Spoken
        </h2>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Select up to 10 · {selectedLangs.length}/10 selected
        </p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => toggleLang(l)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedLangs.includes(l)
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Online Presence */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-gray-100">
          Online Presence
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Years of Experience
            </label>
            <input
              type="number"
              min="0"
              max="50"
              value={yearsExperience}
              onChange={(e) => setYearsExperience(e.target.value)}
              placeholder="e.g. 5"
              className="mt-1 w-32 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Instagram URL
            </label>
            <input
              type="url"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="https://instagram.com/yourstudio"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
              Website URL
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourstudio.com"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-brand-500 focus:bg-white focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500 dark:focus:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Profile completeness checklist */}
      {profile && (() => {
        const checks = [
          { label: "Studio name set", done: !!name.trim() },
          { label: "Bio (min 50 characters)", done: bio.trim().length >= 50 },
          { label: "City set", done: !!city.trim() },
          { label: "Cover photo uploaded (recommended)", done: !!profile.cover_url },
          { label: "At least 1 package added (recommended)", done: (profile.package_count ?? 0) >= 1 },
          { label: "At least 3 portfolio photos (recommended)", done: (profile.portfolio_count ?? 0) >= 3 },
        ];
        const requiredChecks = checks.slice(0, 3);
        const completedCount = checks.filter((c) => c.done).length;
        const allDone = requiredChecks.every((c) => c.done);
        return (
          <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Profile Completeness
              </h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                allDone
                  ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
              }`}>
                {completedCount}/{checks.length} complete
              </span>
            </div>
            {/* Marketplace visibility status */}
            <div className={`mb-4 flex items-start gap-3 rounded-lg p-3 ${
              allDone && isListed
                ? "bg-green-50 dark:bg-green-900/20"
                : "bg-yellow-50 dark:bg-yellow-900/20"
            }`}>
              <span className="text-lg">{allDone && isListed ? "🟢" : "🟡"}</span>
              <div>
                <p className={`text-sm font-medium ${
                  allDone && isListed ? "text-green-800 dark:text-green-300" : "text-yellow-800 dark:text-yellow-300"
                }`}>
                  {allDone && isListed
                    ? "Your studio is visible on the Explore page"
                    : !allDone
                    ? "Complete your profile to appear on Explore"
                    : "Profile is complete — enable listing to go live"}
                </p>
                {!allDone && (
                  <p className="mt-0.5 text-xs text-yellow-700 dark:text-yellow-400">
                    {checks.filter((c) => !c.done).map((c) => c.label).join(", ")}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {checks.map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={done ? "text-green-500" : "text-gray-300 dark:text-gray-600"}>
                    {done ? "✅" : "○"}
                  </span>
                  <span className={`text-sm ${done ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Save footer */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
