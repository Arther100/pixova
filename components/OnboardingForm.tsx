// ============================================
// OnboardingForm — Studio setup wizard (Step 1 & 2)
// Step 1: Personal info + Studio basics
// Step 2: Location + Specializations
// ============================================

"use client";

import { useState, useCallback, useEffect } from "react";
import { Button, Input } from "@/components/ui";

interface OnboardingData {
  fullName: string;
  studioName: string;
  studioSlug: string;
  phone: string;
  email: string;
  tagline: string;
  bio: string;
  whatsapp: string;
  website: string;
  instagram: string;
  city: string;
  state: string;
  pincode: string;
  specializations: string[];
  languages: string[];
  startingPrice: string; // display as rupees, convert to paise on submit
}

interface OnboardingFormProps {
  initialPhone?: string;
  initialData?: OnboardingData | null;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onComplete: (data: OnboardingData) => void;
  loading?: boolean;
}

const SPECIALIZATION_OPTIONS = [
  "Wedding",
  "Pre-Wedding",
  "Portrait",
  "Newborn",
  "Maternity",
  "Birthday",
  "Corporate",
  "Product",
  "Food",
  "Fashion",
  "Travel",
  "Real Estate",
  "Event",
  "Candid",
];

const LANGUAGE_OPTIONS = [
  "Hindi",
  "English",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
  "Odia",
  "Urdu",
];

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export function OnboardingForm({
  initialPhone = "",
  initialData = null,
  initialStep = 1,
  onStepChange,
  onComplete,
  loading = false,
}: OnboardingFormProps) {
  const [step, setStepLocal] = useState(initialStep);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(
    initialData ? initialData.phone === initialData.whatsapp : !!initialPhone
  );

  // Sync step with parent
  const setStep = useCallback(
    (s: number | ((prev: number) => number)) => {
      setStepLocal((prev) => {
        const next = typeof s === "function" ? s(prev) : s;
        onStepChange?.(next);
        return next;
      });
    },
    [onStepChange]
  );

  const [form, setForm] = useState<OnboardingData>(
    initialData || {
      fullName: "",
      studioName: "",
      studioSlug: "",
      phone: initialPhone,
      email: "",
      tagline: "",
      bio: "",
      whatsapp: initialPhone,
      website: "",
      instagram: "",
      city: "",
      state: "",
      pincode: "",
      specializations: [],
      languages: ["Hindi", "English"],
      startingPrice: "",
    }
  );

  // ── Sync phone when initialPhone prop arrives (async from JWT) ──
  useEffect(() => {
    if (initialPhone && !form.phone) {
      setForm((prev) => ({
        ...prev,
        phone: initialPhone,
        whatsapp: whatsappSameAsPhone ? initialPhone : prev.whatsapp,
      }));
    }
  }, [initialPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update field ──
  const updateField = useCallback(
    <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    []
  );

  // ── Auto-generate slug from studio name ──
  const handleStudioNameChange = useCallback(
    (name: string) => {
      updateField("studioName", name);
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      updateField("studioSlug", slug);
      setSlugAvailable(null);
    },
    [updateField]
  );

  // ── Check slug availability ──
  const checkSlug = useCallback(async (slug: string) => {
    if (slug.length < 3) return;
    setSlugChecking(true);
    try {
      // Simple check via API — will be validated server-side anyway
      const res = await fetch(
        `/api/v1/auth/check-slug?slug=${encodeURIComponent(slug)}`
      );
      const data = await res.json();
      setSlugAvailable(data.data?.available ?? true);
    } catch {
      setSlugAvailable(null);
    } finally {
      setSlugChecking(false);
    }
  }, []);

  // ── Toggle multi-select ──
  const toggleOption = useCallback(
    (key: "specializations" | "languages", value: string) => {
      setForm((prev) => {
        const arr = prev[key];
        const next = arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value];
        return { ...prev, [key]: next };
      });
    },
    []
  );

  // ── Validate step ──
  const validateStep = useCallback(
    (s: number): boolean => {
      const errs: Record<string, string> = {};

      if (s === 1) {
        if (!form.fullName.trim())
          errs.fullName = "Your name is required";
        if (form.fullName.trim().length > 100)
          errs.fullName = "Name must be under 100 characters";
        if (!form.studioName.trim())
          errs.studioName = "Studio name is required";
        if (form.studioName.trim().length < 2)
          errs.studioName = "Studio name must be at least 2 characters";
        if (form.studioName.trim().length > 50)
          errs.studioName = "Studio name must be under 50 characters";
        if (!form.studioSlug.trim())
          errs.studioSlug = "Studio URL is required";
        if (!/^[a-z0-9-]+$/.test(form.studioSlug))
          errs.studioSlug =
            "Only lowercase letters, numbers, and hyphens allowed";
        if (form.studioSlug.length < 3)
          errs.studioSlug = "URL must be at least 3 characters";
        if (!form.phone.trim()) errs.phone = "Phone is required";
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
          errs.email = "Invalid email format";
      }

      if (s === 2) {
        if (!form.city.trim()) errs.city = "City is required";
        if (!form.state.trim()) errs.state = "State is required";
        if (form.specializations.length === 0)
          errs.specializations = "Select at least one specialization";
      }

      setErrors(errs);
      return Object.keys(errs).length === 0;
    },
    [form]
  );

  // ── Next step ──
  const handleNext = useCallback(() => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  }, [step, validateStep, setStep]);

  // ── Submit ──
  const handleSubmit = useCallback(() => {
    if (!validateStep(2)) return;
    onComplete(form);
  }, [form, validateStep, onComplete]);

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                s <= step
                  ? "bg-brand-600 text-white"
                  : "bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-300"
              }`}
            >
              {s}
            </div>
            {s < 2 && (
              <div
                className={`h-0.5 w-12 ${
                  s < step ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
          {step === 1 ? "Studio Basics" : "Location & Skills"}
        </span>
      </div>

      {step === 1 && (
        // ── Step 1: Personal + Studio basics ──
        <div className="space-y-4">
          <Input
            label="Your Full Name *"
            value={form.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            placeholder="Rajesh Kumar"
            error={errors.fullName}
          />

          <Input
            label="Studio Name *"
            value={form.studioName}
            onChange={(e) => handleStudioNameChange(e.target.value)}
            placeholder="Pixel Perfect Studios"
            hint="2–50 characters"
            error={errors.studioName}
          />

          <div>
            <Input
              label="Studio URL *"
              value={form.studioSlug}
              onChange={(e) => {
                updateField(
                  "studioSlug",
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                );
                setSlugAvailable(null);
              }}
              onBlur={() => checkSlug(form.studioSlug)}
              placeholder="pixel-perfect-studios"
              hint={`pixova.in/${form.studioSlug || "your-studio"}`}
              error={errors.studioSlug}
            />
            {slugChecking && (
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Checking…</p>
            )}
            {slugAvailable === true && (
              <p className="mt-1 text-xs text-green-600">✓ Available</p>
            )}
            {slugAvailable === false && (
              <p className="mt-1 text-xs text-red-500">✗ Already taken</p>
            )}
          </div>

          <Input
            label="Phone *"
            value={form.phone}
            onChange={(e) =>
              updateField("phone", e.target.value.replace(/\D/g, ""))
            }
            placeholder="9876543210"
            error={errors.phone}
            disabled
          />

          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="studio@example.com"
            error={errors.email}
          />

          <Input
            label="Tagline"
            value={form.tagline}
            onChange={(e) => updateField("tagline", e.target.value)}
            placeholder="Capturing your special moments"
            hint="Short description for your studio page"
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              About Your Studio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              placeholder="Tell clients about your experience, style, and what makes you special…"
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-1 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  WhatsApp
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={whatsappSameAsPhone}
                    onChange={(e) => {
                      setWhatsappSameAsPhone(e.target.checked);
                      if (e.target.checked) {
                        updateField("whatsapp", form.phone);
                      }
                    }}
                    className="h-3.5 w-3.5 rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Same as phone
                  </span>
                </label>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={whatsappSameAsPhone ? form.phone : form.whatsapp}
                onChange={(e) =>
                  updateField("whatsapp", e.target.value.replace(/\D/g, ""))
                }
                placeholder="9876543210"
                disabled={whatsappSameAsPhone}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 ${
                  whatsappSameAsPhone
                    ? "bg-gray-100 text-gray-500 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"
                    : "border-gray-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:border-gray-600"
                }`}
              />
            </div>
            <Input
              label="Instagram"
              value={form.instagram}
              onChange={(e) => updateField("instagram", e.target.value)}
              placeholder="@yourstudio"
            />
          </div>

          <Input
            label="Website"
            type="url"
            value={form.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://yourstudio.com"
          />

          <Button onClick={handleNext} className="w-full">
            Next — Location &amp; Skills →
          </Button>
        </div>
      )}

      {step === 2 && (
        // ── Step 2: Location + Specializations ──
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City *"
              value={form.city}
              onChange={(e) => updateField("city", e.target.value)}
              placeholder="Mumbai"
              error={errors.city}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                State *
              </label>
              <select
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-gray-100 [&>option]:dark:bg-gray-800 [&>option]:dark:text-gray-100 ${
                  errors.state ? "border-red-500" : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="mt-1 text-xs text-red-500">{errors.state}</p>
              )}
            </div>
          </div>

          <Input
            label="Pincode"
            value={form.pincode}
            onChange={(e) =>
              updateField("pincode", e.target.value.replace(/\D/g, ""))
            }
            placeholder="400001"
            maxLength={6}
          />

          {/* Specializations */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Specializations * <span className="text-gray-400 dark:text-gray-500">(select at least one)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATION_OPTIONS.map((spec) => (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleOption("specializations", spec.toLowerCase())}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.specializations.includes(spec.toLowerCase())
                      ? "border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-600"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
            {errors.specializations && (
              <p className="mt-1 text-xs text-red-500">
                {errors.specializations}
              </p>
            )}
          </div>

          {/* Languages */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Languages Spoken
            </label>
            <div className="flex flex-wrap gap-2">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleOption("languages", lang)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    form.languages.includes(lang)
                      ? "border-brand-600 bg-brand-600 text-white dark:border-brand-500 dark:bg-brand-600"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Starting Price */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Starting Price
            </label>
            <div className="flex overflow-hidden rounded-xl border border-gray-300 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500 dark:border-gray-600">
              <span className="flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                ₹
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={form.startingPrice}
                onChange={(e) =>
                  updateField(
                    "startingPrice",
                    e.target.value.replace(/\D/g, "")
                  )
                }
                placeholder="10000"
                className="flex-1 px-3 py-2.5 text-sm outline-none dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Starting price for your cheapest package
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setStep(1)}
              className="flex-1"
            >
              ← Back
            </Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
              className="flex-1"
            >
              Save &amp; Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
