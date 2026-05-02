"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Studio {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  bio: string | null;
  city: string | null;
  state: string | null;
  specializations: string[];
  languages: string[];
  starting_price: number | null;
  avg_rating: number;
  review_count: number;
  total_bookings: number;
  years_experience: number;
  total_events: number;
  response_rate: number;
  is_verified: boolean;
  featured: boolean;
  instagram_url: string | null;
  website_url: string | null;
  cover_photo_url: string | null;
}

interface Package {
  id: string;
  name: string;
  description: string | null;
  price: number;
  deliverables: string | null;
  duration_hours: number | null;
}

interface PortfolioPhoto {
  photo_id: string;
  url: string;
  thumbnail_url: string;
  filename: string;
}

interface Review {
  id: string;
  rating: number;
  review_text: string;
  photographer_reply: string | null;
  submitted_at: string;
  event_type: string | null;
}

interface StudioData {
  studio: Studio;
  packages: Package[];
  portfolio: PortfolioPhoto[];
  reviews: Review[];
  blocked_dates: string[];
}

type TabKey = "portfolio" | "packages" | "reviews" | "availability";

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? "text-yellow-400" : "text-gray-300"}>★</span>
      ))}
    </span>
  );
}

function AvailabilityCalendar({ blockedDates }: { blockedDates: string[] }) {
  const [currentDate] = useState(new Date());
  const [month, setMonth] = useState(currentDate.getMonth());
  const [year, setYear] = useState(currentDate.getFullYear());

  const blockedSet = new Set(blockedDates);
  const today = new Date().toISOString().split("T")[0];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthName = new Date(year, month).toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}
          className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
        >←</button>
        <span className="font-medium text-gray-900 dark:text-white">{monthName}</span>
        <button
          onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}
          className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
        >→</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => <div key={d} className="py-1 font-medium">{d}</div>)}
        {[...Array(firstDay)].map((_, i) => <div key={`e${i}`} />)}
        {[...Array(daysInMonth)].map((_, i) => {
          const d = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const isBlocked = blockedSet.has(dateStr);
          const isPast = dateStr < today;
          return (
            <div
              key={d}
              className={`flex h-8 items-center justify-center rounded-lg text-xs font-medium transition-colors
                ${isPast ? "text-gray-300 dark:text-gray-700" :
                  isBlocked ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                  "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"}`}
            >
              {d}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-green-100 dark:bg-green-900/30" /> Available</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-100 dark:bg-red-900/30" /> Booked</span>
      </div>
    </div>
  );
}

export default function StudioProfileContent({ data }: { data: StudioData }) {
  const { studio, packages, portfolio, reviews, blocked_dates } = data;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("portfolio");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const priceStr = studio.starting_price
    ? `₹${(studio.starting_price / 100).toLocaleString("en-IN")}`
    : null;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: "portfolio", label: "Portfolio", count: portfolio.length },
    { key: "packages",  label: "Packages",  count: packages.length },
    { key: "reviews",   label: "Reviews",   count: reviews.length },
    { key: "availability", label: "Availability" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/explore" className="flex items-center gap-1 text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400">
            ← Explore
          </Link>
          <Link href="/" className="font-display text-xl font-bold text-brand-600">Pixova</Link>
          <Link href="/account" className="text-sm text-gray-600 hover:text-brand-600 dark:text-gray-400">My Account</Link>
        </div>
      </header>

      {/* Cover photo */}
      <div className="h-72 overflow-hidden bg-gray-200 dark:bg-gray-800 md:h-96">
        {studio.cover_photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={studio.cover_photo_url} alt={studio.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-6xl text-gray-300">📷</div>
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4">
        {/* Studio header card */}
        <div className="-mt-8 rounded-2xl border border-gray-100 bg-white p-5 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
                  {studio.name}
                </h1>
                {studio.is_verified && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    ✓ Verified
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                📍 {studio.city}{studio.state ? `, ${studio.state}` : ""}
              </p>
              {studio.avg_rating > 0 && (
                <div className="mt-1 flex items-center gap-2">
                  <StarRow rating={Math.round(studio.avg_rating)} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {studio.avg_rating.toFixed(1)} · {studio.review_count} review{studio.review_count !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {(studio.specializations || []).map((s) => (
                  <span key={s} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
                    {s}
                  </span>
                ))}
              </div>
              {priceStr && (
                <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">
                  Starting {priceStr}
                </p>
              )}
            </div>
            {/* Actions */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => router.push(`/${studio.slug}/enquire`)}
                className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Send Enquiry →
              </button>
              {studio.instagram_url && (
                <a
                  href={studio.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Instagram
                </a>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-4 dark:border-gray-800">
            {studio.years_experience > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{studio.years_experience}</p>
                <p className="text-xs text-gray-500">Years exp.</p>
              </div>
            )}
            {studio.total_bookings > 0 && (
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{studio.total_bookings}</p>
                <p className="text-xs text-gray-500">Bookings</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{studio.response_rate}%</p>
              <p className="text-xs text-gray-500">Response rate</p>
            </div>
          </div>
        </div>

        {/* Bio */}
        {studio.bio && (
          <div className="mt-6 rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-2 font-semibold text-gray-900 dark:text-white">About</h2>
            <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">{studio.bio}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6">
          <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  activeTab === t.key
                    ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                }`}
              >
                {t.label}{t.count != null ? ` (${t.count})` : ""}
              </button>
            ))}
          </div>

          <div className="mt-4 pb-12">
            {/* Portfolio tab */}
            {activeTab === "portfolio" && (
              portfolio.length === 0 ? (
                <div className="py-16 text-center text-gray-400">No portfolio photos yet.</div>
              ) : (
                <>
                  <p className="mb-3 text-sm text-gray-500">{portfolio.length} photos</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {portfolio.map((p, idx) => (
                      <div
                        key={p.photo_id}
                        className="group relative aspect-square cursor-pointer overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
                        onClick={() => setLightboxIdx(idx)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.thumbnail_url || p.url}
                          alt={p.filename}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                </>
              )
            )}

            {/* Packages tab */}
            {activeTab === "packages" && (
              packages.length === 0 ? (
                <div className="py-16 text-center text-gray-400">No packages listed yet.</div>
              ) : (
                <div className="space-y-3">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="flex items-start justify-between rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{pkg.name}</h3>
                        {pkg.description && (
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{pkg.description}</p>
                        )}
                        {pkg.deliverables && (
                          <p className="mt-1 text-xs text-gray-500">Includes: {pkg.deliverables}</p>
                        )}
                        {pkg.duration_hours && (
                          <p className="mt-1 text-xs text-gray-500">{pkg.duration_hours} hour{pkg.duration_hours !== 1 ? "s" : ""}</p>
                        )}
                      </div>
                      <div className="ml-4 text-right shrink-0">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          ₹{(pkg.price / 100).toLocaleString("en-IN")}
                        </p>
                        <button
                          onClick={() => router.push(`/${studio.slug}/enquire`)}
                          className="mt-2 text-sm font-medium text-brand-600 hover:underline"
                        >
                          Enquire →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Reviews tab */}
            {activeTab === "reviews" && (
              reviews.length === 0 ? (
                <div className="py-16 text-center text-gray-400">No reviews yet.</div>
              ) : (
                <>
                  <div className="mb-4 flex items-center gap-3">
                    <StarRow rating={Math.round(studio.avg_rating)} />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {studio.avg_rating.toFixed(1)} from {studio.review_count} reviews
                    </span>
                  </div>
                  <div className="space-y-4">
                    {reviews.map((r) => (
                      <div key={r.id} className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between">
                          <StarRow rating={r.rating} />
                          <span className="text-xs text-gray-400">
                            {r.event_type && <span className="mr-2">{r.event_type}</span>}
                            {new Date(r.submitted_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                          </span>
                        </div>
                        {r.review_text && (
                          <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">&ldquo;{r.review_text}&rdquo;</p>
                        )}
                        {r.photographer_reply && (
                          <div className="mt-3 rounded-lg bg-brand-50 p-3 dark:bg-brand-900/20">
                            <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">Studio reply:</p>
                            <p className="mt-1 text-xs text-brand-600 dark:text-brand-400">{r.photographer_reply}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )
            )}

            {/* Availability tab */}
            {activeTab === "availability" && (
              <div className="max-w-sm">
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Click an available date to pre-fill the enquiry form.
                </p>
                <AvailabilityCalendar blockedDates={blocked_dates} />
                <button
                  onClick={() => router.push(`/${studio.slug}/enquire`)}
                  className="mt-4 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                >
                  Send Enquiry →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && portfolio[lightboxIdx] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIdx(null)}
        >
          <button
            className="absolute right-4 top-4 text-white text-2xl hover:text-gray-300"
            onClick={() => setLightboxIdx(null)}
          >
            ✕
          </button>
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-3xl hover:text-gray-300 disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => Math.max(0, (i ?? 0) - 1)); }}
            disabled={lightboxIdx === 0}
          >
            ‹
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={portfolio[lightboxIdx].url}
            alt={portfolio[lightboxIdx].filename}
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-3xl hover:text-gray-300 disabled:opacity-30"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx((i) => Math.min(portfolio.length - 1, (i ?? 0) + 1)); }}
            disabled={lightboxIdx === portfolio.length - 1}
          >
            ›
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/70">
            {lightboxIdx + 1} / {portfolio.length}
          </p>
        </div>
      )}
    </div>
  );
}
