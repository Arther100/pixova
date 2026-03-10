// ============================================
// /onboarding — Studio setup wizard (3 steps)
// Step 1: Studio Basics · Step 2: Packages · Step 3: Go Live
// ============================================

"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OnboardingForm } from "@/components/OnboardingForm";
import { PackageSetupForm } from "@/components/PackageSetupForm";
import { OnboardingProgress } from "@/components/OnboardingProgress";
import { ProfileCompletionBar } from "@/components/ProfileCompletionBar";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

type Step = 1 | 2 | 3;

interface StudioFormData {
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
  startingPrice: string;
}

interface PackageData {
  name: string;
  description: string;
  price: string;
  deliverables: string;
  durationHours: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const STEP_INFO = [
    { title: t.onboarding.step1Title, subtitle: t.onboarding.step1Subtitle },
    { title: t.onboarding.step2Title, subtitle: t.onboarding.step2Subtitle },
    { title: t.onboarding.step3Title, subtitle: t.onboarding.step3Subtitle },
  ];
  const [step, setStep] = useState<Step>(1);
  const [studioData, setStudioData] = useState<StudioFormData | null>(null);
  const [packageData, setPackageData] = useState<PackageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [profileScore, setProfileScore] = useState(0);
  const [loginPhone, setLoginPhone] = useState("");

  // ── Extract phone from JWT (cookie or _pxtoken URL param) ──
  useEffect(() => {
    try {
      let token = document.cookie
        .split("; ")
        .find((c) => c.startsWith("pixova_session="))
        ?.split("=")[1];

      if (!token) {
        token = searchParams.get("_pxtoken") || undefined;
      }

      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const phone = (payload.phone || "").replace("+91", "");
        if (phone) setLoginPhone(phone);
      }
    } catch {
      // Silently fail — phone field will just be empty
    }
  }, [searchParams]);

  // ── Calculate a client-side profile score estimate ──
  const estimateProfileScore = useCallback(
    (studio: StudioFormData, pkgs: PackageData[]) => {
      let score = 0;
      if (studio.fullName) score += 10;
      if (studio.studioName) score += 15;
      if (studio.bio) score += 10;
      if (studio.tagline) score += 5;
      if (studio.city) score += 10;
      if (studio.phone || studio.whatsapp) score += 10;
      if (studio.specializations.length > 0) score += 10;
      if (pkgs.length > 0) score += 15;
      setProfileScore(Math.min(score, 100));
    },
    []
  );

  // ── Step 1 completed ──
  const handleStudioComplete = (data: StudioFormData) => {
    setStudioData(data);
    estimateProfileScore(data, packageData);
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Step 2 completed (packages) ──
  const handlePackagesComplete = (packages: PackageData[]) => {
    setPackageData(packages);
    if (studioData) estimateProfileScore(studioData, packages);
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Step 2 skip ──
  const handleSkipPackages = () => {
    setPackageData([]);
    if (studioData) estimateProfileScore(studioData, []);
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Step 3: Save everything & go to dashboard ──
  const handleGoLive = async () => {
    if (!studioData) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studio: {
            fullName: studioData.fullName,
            studioName: studioData.studioName,
            slug: studioData.studioSlug,
            email: studioData.email,
            tagline: studioData.tagline,
            bio: studioData.bio,
            whatsapp: studioData.whatsapp,
            instagram: studioData.instagram,
            website: studioData.website,
            city: studioData.city,
            state: studioData.state,
            pincode: studioData.pincode,
            specializations: studioData.specializations,
            languages: studioData.languages,
            startingPrice: studioData.startingPrice,
            isPublic,
          },
          packages: packageData.map((pkg, i) => ({
            name: pkg.name,
            description: pkg.description || null,
            price: parseInt(pkg.price, 10) * 100,
            deliverables: pkg.deliverables || null,
            durationHours: pkg.durationHours
              ? parseInt(pkg.durationHours, 10)
              : null,
            sortOrder: i,
          })),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || t.onboarding.saveFailed);
        return;
      }

      // Hard navigation so the browser picks up the new pixova_onboarded=1 cookie
      // set by the API. router.push() would use client-side nav and the old
      // middleware cookie cache would bounce us back to /onboarding.
      window.location.href = "/dashboard";
    } catch {
      setError(t.onboarding.somethingWrong);
    } finally {
      setLoading(false);
    }
  };

  const currentInfo = STEP_INFO[step - 1];

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950">
      {/* Full-screen loading overlay when launching */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-6 shadow-2xl dark:bg-gray-900">
            <svg className="h-8 w-8 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t.onboarding.launching}
            </p>
          </div>
        </div>
      )}
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200/60 bg-white/90 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/90">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="font-display text-xl font-bold text-brand-600">
              Pixova
            </span>
            <a
              href="/api/v1/auth/logout"
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:border-red-300 hover:text-red-600 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-700 dark:hover:text-red-400"
            >
              {t.onboarding.signOut}
            </a>
          </div>
          <span className="rounded-full border border-brand-600 bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
            {step} {t.onboarding.stepOf} 3
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-20 pt-8">
        {/* Step header */}
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-gray-100">
            {currentInfo.title}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {currentInfo.subtitle}
          </p>
        </div>

        {/* Progress bar */}
        <OnboardingProgress
          currentStep={step}
          totalSteps={3}
          labels={[t.onboarding.studioBasicsLabel, t.onboarding.packagesLabel, t.onboarding.goLiveLabel]}
        />

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800 dark:bg-red-900/20">
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-medium text-red-700">{error}</p>
          </div>
        )}

        {/* Step content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          {/* Step 1: Studio Basics */}
          {step === 1 && (
            <OnboardingForm
              initialPhone={loginPhone}
              initialData={studioData}
              initialStep={1}
              onStepChange={() => {}}
              onComplete={handleStudioComplete}
            />
          )}

          {/* Step 2: Packages */}
          {step === 2 && (
            <div>
              <PackageSetupForm
                onComplete={handlePackagesComplete}
                onSkip={handleSkipPackages}
                loading={false}
              />
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mt-5 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-600 transition-colors dark:text-gray-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                {t.onboarding.backToBasics}
              </button>
            </div>
          )}

          {/* Step 3: Go Live */}
          {step === 3 && studioData && (
            <div className="space-y-6">
              {/* Profile score */}
              <div className="rounded-xl bg-gradient-to-r from-brand-50 to-brand-100/50 p-5 dark:from-gray-800 dark:to-gray-800/80">
                <ProfileCompletionBar score={profileScore} />
                <p className="mt-2.5 text-xs text-gray-600 dark:text-gray-400">
                  {profileScore >= 80
                    ? t.onboarding.profileGood
                    : t.onboarding.profileTip}
                </p>
              </div>

              {/* Preview card */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-600 dark:text-brand-400"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                  </span>
                  {t.onboarding.profilePreview}
                </h3>
                <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5 dark:border-gray-700 dark:bg-gray-800/50">
                  <div className="flex items-start gap-4">
                    {/* Avatar placeholder */}
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-600">
                      {studioData.studioName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {studioData.studioName}
                      </h4>
                      {studioData.tagline && (
                        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                          {studioData.tagline}
                        </p>
                      )}
                      {studioData.city && (
                        <p className="mt-1 text-xs text-gray-400">
                          📍 {studioData.city}
                          {studioData.state ? `, ${studioData.state}` : ""}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Specializations */}
                  {studioData.specializations.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {studioData.specializations.map((spec) => (
                        <span
                          key={spec}
                          className="rounded-full bg-white px-2.5 py-1 text-xs font-medium capitalize text-gray-700 shadow-sm ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Packages summary */}
                  {packageData.length > 0 && (
                    <div className="mt-4 flex items-center gap-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                      <span className="text-sm">📦</span>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {packageData.length} package{packageData.length > 1 ? "s" : ""} •{" "}
                        {t.onboarding.startingFrom}{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          ₹{Math.min(
                            ...packageData.map((p) => parseInt(p.price) || 0)
                          ).toLocaleString("en-IN")}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Studio URL */}
                  <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                    <span className="text-xs">🔗</span>
                    <p className="text-sm font-medium text-brand-600">
                      pixova.in/{studioData.studioSlug}
                    </p>
                  </div>
                </div>
              </div>

              {/* Public toggle */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t.onboarding.makePublic}
                  </h4>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {t.onboarding.discoverOnPixova}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isPublic ? "bg-brand-600" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                      isPublic ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  {t.onboarding.back}
                </Button>
                <Button
                  onClick={handleGoLive}
                  loading={loading}
                  className="flex-1"
                >
                  {t.onboarding.launchStudio}
                </Button>
              </div>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                {t.onboarding.updateFromSettings}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
