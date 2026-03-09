// ============================================
// GET /api/v1/dashboard
// Returns dashboard data for authenticated photographer
// ============================================

import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getSessionFromCookie } from "@/lib/session";
import { calculateProfileScore } from "@/lib/auth";
import { SUBSCRIPTION_PLANS } from "@/lib/constants";

export async function GET() {
  try {
    // ── Auth check via JWT ──
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const admin = createSupabaseAdmin();

    // ── Fetch photographer ──
    const { data: photographer, error: pErr } = await admin
      .from("photographers")
      .select("id, full_name, avatar_url, phone")
      .eq("id", session.photographerId)
      .single();

    if (pErr || !photographer) return unauthorizedResponse("Photographer not found");

    // ── Fetch all data in parallel ──
    const [studioRes, subscriptionRes, todayBookingsRes, enquiriesRes, notificationsRes] =
      await Promise.all([
        // Studio profile
        admin
          .from("studio_profiles")
          .select("id, name, slug, is_listed, bio, tagline, city, specializations, logo_url")
          .eq("photographer_id", photographer.id)
          .limit(1)
          .single(),

        // Active subscription with plan
        admin
          .from("subscriptions")
          .select("id, plan_id, status, billing_cycle, current_period_start, current_period_end, trial_ends_at")
          .eq("photographer_id", photographer.id)
          .in("status", ["trialing", "active"])
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),

        // Today's bookings count
        admin
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("photographer_id", photographer.id)
          .gte("event_date", new Date().toISOString().split("T")[0])
          .lte("event_date", new Date().toISOString().split("T")[0]),

        // Pending enquiries count
        admin
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("photographer_id", photographer.id)
          .eq("status", "enquiry"),

        // Unread notifications count
        admin
          .from("notification_logs")
          .select("id", { count: "exact", head: true })
          .eq("photographer_id", photographer.id)
          .eq("read", false),
      ]);

    // ── Resolve plan details ──
    let planName = "Starter";
    let bookingsLimit = 10;

    if (subscriptionRes.data?.plan_id) {
      const { data: plan } = await admin
        .from("plans")
        .select("name, tier, slug")
        .eq("id", subscriptionRes.data.plan_id)
        .single();

      if (plan) {
        planName = plan.name;
        const planConfig =
          SUBSCRIPTION_PLANS[plan.slug as keyof typeof SUBSCRIPTION_PLANS];
        if (planConfig) {
          // maxGalleries as proxy for bookings limit
          bookingsLimit = planConfig.maxGalleries;
        }
      }
    }

    // ── Count bookings this billing cycle ──
    let bookingsUsed = 0;
    if (subscriptionRes.data?.current_period_start) {
      const { count } = await admin
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("photographer_id", photographer.id)
        .gte("created_at", subscriptionRes.data.current_period_start);

      bookingsUsed = count ?? 0;
    }

    // ── Check if has packages ──
    let hasPackages = false;
    if (studioRes.data?.id) {
      const { count: pkgCount } = await admin
        .from("studio_packages")
        .select("id", { count: "exact", head: true })
        .eq("studio_id", studioRes.data.id);

      hasPackages = (pkgCount ?? 0) > 0;
    }

    // ── Calculate profile score ──
    const profileScore = calculateProfileScore({
      full_name: photographer.full_name,
      avatar_url: photographer.avatar_url,
      studio_name: studioRes.data?.name ?? null,
      studio_bio: studioRes.data?.bio ?? null,
      studio_tagline: studioRes.data?.tagline ?? null,
      studio_logo: studioRes.data?.logo_url ?? null,
      studio_city: studioRes.data?.city ?? null,
      studio_phone: photographer.phone,
      studio_specializations: studioRes.data?.specializations ?? null,
      has_packages: hasPackages,
    });

    return successResponse({
      photographer: {
        fullName: photographer.full_name,
        avatarUrl: photographer.avatar_url,
      },
      studio: studioRes.data
        ? {
            id: studioRes.data.id,
            name: studioRes.data.name,
            slug: studioRes.data.slug,
            isPublic: studioRes.data.is_listed ?? false,
          }
        : null,
      subscription: subscriptionRes.data
        ? {
            planName,
            status: subscriptionRes.data.status,
            trialEndsAt: subscriptionRes.data.trial_ends_at,
            bookingsUsed,
            bookingsLimit,
          }
        : null,
      stats: {
        todayBookings: todayBookingsRes.count ?? 0,
        pendingEnquiries: enquiriesRes.count ?? 0,
        unreadNotifications: notificationsRes.count ?? 0,
      },
      profileScore,
    });
  } catch (err) {
    console.error("[dashboard] Unexpected error:", err);
    return serverErrorResponse();
  }
}
