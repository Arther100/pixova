// ============================================
// POST /api/v1/onboarding
// Creates studio_profile + packages, marks photographer onboarded
// ============================================

import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { createSupabaseAdmin } from "@/lib/supabase";
import { getSessionFromCookie } from "@/lib/session";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import {
  generateUniqueSlug,
  isSlugAvailable,
  calculateProfileScore,
} from "@/lib/auth";

// ── Request schema ──
const onboardingSchema = z.object({
  studio: z.object({
    fullName: z.string().min(2).max(200),
    studioName: z.string().min(2).max(100),
    slug: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-z0-9-]+$/)
      .optional(),
    email: z.email().optional().or(z.literal("")),
    tagline: z.string().max(200).optional().or(z.literal("")),
    bio: z.string().max(2000).optional().or(z.literal("")),
    whatsapp: z.string().max(15).optional().or(z.literal("")),
    instagram: z.string().max(100).optional().or(z.literal("")),
    website: z.string().max(255).optional().or(z.literal("")),
    city: z.string().max(100).optional().or(z.literal("")),
    state: z.string().max(100).optional().or(z.literal("")),
    pincode: z.string().max(10).optional().or(z.literal("")),
    specializations: z.array(z.string().max(50)).max(10).optional(),
    languages: z.array(z.string().max(30)).max(10).optional(),
    startingPrice: z
      .string()
      .optional()
      .or(z.literal("")),
    isPublic: z.boolean().optional().default(false),
  }),
  packages: z.array(
    z.object({
      name: z.string().min(1).max(200),
      description: z.string().max(2000).nullable().optional(),
      price: z.number().int().min(0), // paise
      deliverables: z.string().max(1000).nullable().optional(),
      durationHours: z.number().int().min(1).max(720).nullable().optional(),
      sortOrder: z.number().int().min(0).default(0),
    })
  ),
});

export async function POST(request: NextRequest) {
  try {
    // ── Auth check via JWT ──
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const admin = createSupabaseAdmin();

    // Get photographer record
    const { data: photographer, error: pErr } = await admin
      .from("photographers")
      .select("id, phone, is_onboarded")
      .eq("id", session.photographerId)
      .single();

    if (pErr || !photographer) return unauthorizedResponse("Photographer not found");

    // Already onboarded? Don't allow re-onboarding via this endpoint
    if (photographer.is_onboarded) {
      return errorResponse("Already onboarded. Use settings to update profile.", 409);
    }

    // ── Parse body ──
    const body = await request.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return errorResponse(
        `${firstError.path.join(".")}: ${firstError.message}`
      );
    }

    const { studio, packages } = parsed.data;

    // ── Resolve slug ──
    let slug = studio.slug;
    if (slug) {
      const available = await isSlugAvailable(slug);
      if (!available) {
        slug = await generateUniqueSlug(studio.studioName);
      }
    } else {
      slug = await generateUniqueSlug(studio.studioName);
    }

    // ── Parse starting price (₹ → paise) ──
    const startingPricePaise = studio.startingPrice
      ? parseInt(studio.startingPrice, 10) * 100
      : null;

    // ── Create studio profile ──
    const { data: studioProfile, error: sErr } = await admin
      .from("studio_profiles")
      .insert({
        photographer_id: photographer.id,
        name: studio.studioName,
        slug,
        phone: photographer.phone,
        email: studio.email || null,
        tagline: studio.tagline || null,
        bio: studio.bio || null,
        whatsapp: studio.whatsapp || null,
        instagram: studio.instagram || null,
        website: studio.website || null,
        city: studio.city || null,
        state: studio.state || null,
        pincode: studio.pincode || null,
        specializations: studio.specializations || [],
        languages: studio.languages || [],
        starting_price: startingPricePaise,
        is_listed: studio.isPublic ?? false,
      })
      .select("id")
      .single();

    if (sErr) {
      console.error("[onboarding] studio insert error:", sErr);
      return serverErrorResponse("Failed to create studio profile");
    }

    // ── Create packages ──
    if (packages.length > 0) {
      const packageRows = packages.map((pkg) => ({
        studio_id: studioProfile.id,
        name: pkg.name,
        description: pkg.description ?? null,
        price: pkg.price,
        deliverables: pkg.deliverables ?? null,
        duration_hours: pkg.durationHours ?? null,
        sort_order: pkg.sortOrder,
      }));

      const { error: pkgErr } = await admin
        .from("studio_packages")
        .insert(packageRows);

      if (pkgErr) {
        console.error("[onboarding] packages insert error:", pkgErr);
        // Studio was created — don't fail the whole flow, just log
      }
    }

    // ── Update photographer ──
    await admin
      .from("photographers")
      .update({
        full_name: studio.fullName,
        email: studio.email || null,
        is_onboarded: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", photographer.id);

    // ── Calculate profile score ──
    const score = calculateProfileScore({
      full_name: studio.fullName,
      studio_name: studio.studioName,
      studio_bio: studio.bio || null,
      studio_tagline: studio.tagline || null,
      studio_city: studio.city || null,
      studio_phone: photographer.phone,
      studio_specializations: studio.specializations || [],
      has_packages: packages.length > 0,
    });

    // Store score on studio profile
    await admin
      .from("studio_profiles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", studioProfile.id);

    return successResponse({
      studioId: studioProfile.id,
      slug,
      profileScore: score,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    console.error("[onboarding] unexpected error:", err);
    return serverErrorResponse();
  }
}
