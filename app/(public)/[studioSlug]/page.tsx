// ============================================
// /[studioSlug] — Public studio profile page
// Server Component: generates metadata + fetches data
// ============================================

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import StudioProfileContent from "./StudioProfileContent";
import { createSupabaseAdmin } from "@/lib/supabase";

// Cache 5 minutes
export const revalidate = 300;

const R2_PUBLIC = process.env.R2_PUBLIC_URL ?? "";

function photoUrl(key: string | null): string | null {
  if (!key) return null;
  if (key.startsWith("http")) return key;
  return `${R2_PUBLIC}/${key}`;
}

const RESERVED = [
  "dashboard","bookings","calendar","gallery","galleries","payments","clients",
  "messages","reviews","settings","admin","explore","account","portal","login",
  "onboarding","suspended","privacy","terms","g","agreement","compare","api",
  "enquiries",
];

interface PageProps {
  params: { studioSlug: string };
}

async function fetchStudio(slug: string) {
  try {
    const supabase = createSupabaseAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: studio, error } = await (supabase.from("studio_profiles") as any)
      .select(
        "id, photographer_id, name, slug, tagline, bio, cover_url, city, state, " +
        "specializations, languages, starting_price, avg_rating, total_bookings, " +
        "is_verified, is_listed, instagram, website, " +
        "years_experience, total_events, review_count, response_rate, featured, " +
        "profile_complete, created_at"
      )
      .eq("slug", slug)
      .eq("is_listed", true)
      .single();

    if (error || !studio) return null;

    const studioId = studio.id;
    const photographerId = studio.photographer_id;

    const [packagesRes, portfolioRes, reviewsRes, calendarRes] = await Promise.all([
      supabase
        .from("studio_packages")
        .select("id, name, description, price, deliverables, duration_hours, is_active, sort_order")
        .eq("studio_id", studioId)
        .eq("is_active", true)
        .order("price", { ascending: true }),

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("gallery_photos") as any)
        .select("id, storage_key, thumbnail_key, original_filename, gallery_id")
        .eq("photographer_id", photographerId)
        .eq("show_in_portfolio", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(24),

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from("client_feedback") as any)
        .select("id, rating, review_text, photographer_reply, submitted_at, event_type")
        .eq("studio_id", studioId)
        .eq("is_public", true)
        .order("submitted_at", { ascending: false })
        .limit(10),

      supabase
        .from("calendar_blocks")
        .select("start_date, end_date, status")
        .eq("photographer_id", photographerId)
        .gte("end_date", new Date().toISOString().split("T")[0])
        .lte("start_date", new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .in("status", ["BOOKED", "BLOCKED"]),
    ]);

    // Expand date ranges
    const blockedDates: string[] = [];
    for (const block of calendarRes.data || []) {
      const cur = new Date(block.start_date);
      const end = new Date(block.end_date);
      while (cur <= end) {
        blockedDates.push(cur.toISOString().split("T")[0]);
        cur.setDate(cur.getDate() + 1);
      }
    }

    return {
      studio: {
        ...studio,
        cover_photo_url: photoUrl(studio.cover_url),
        instagram_url: studio.instagram,
        website_url: studio.website,
      },
      packages: packagesRes.data || [],
      portfolio: (portfolioRes.data || []).map((p: { id: string; storage_key: string; thumbnail_key: string | null; original_filename: string | null; gallery_id: string }) => ({
        ...p,
        url: photoUrl(p.storage_key),
        thumbnail_url: photoUrl(p.thumbnail_key || p.storage_key),
      })),
      reviews: reviewsRes.data || [],
      blocked_dates: Array.from(new Set(blockedDates)),
    };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  if (RESERVED.includes(params.studioSlug)) return {};
  const data = await fetchStudio(params.studioSlug);
  if (!data?.studio) return {};
  const s = data.studio;
  const price = s.starting_price
    ? `₹${(s.starting_price / 100).toLocaleString("en-IN")}`
    : null;
  const description =
    s.tagline ||
    `Book ${s.name} for your events in ${s.city}. ${(s.specializations || []).join(", ")} photography${price ? ` starting ${price}` : ""}.`;

  return {
    title: `${s.name} — Photography in ${s.city} | Pixova`,
    description,
    openGraph: {
      title: s.name,
      description,
      images: s.cover_photo_url ? [{ url: s.cover_photo_url }] : [],
      siteName: "Pixova",
    },
    twitter: {
      card: "summary_large_image",
      title: s.name,
      description,
      images: s.cover_photo_url ? [s.cover_photo_url] : [],
    },
  };
}

export default async function StudioProfilePage({ params }: PageProps) {
  if (RESERVED.includes(params.studioSlug)) {
    notFound();
  }

  const data = await fetchStudio(params.studioSlug);
  if (!data?.studio) notFound();

  return <StudioProfileContent data={data} />;
}
