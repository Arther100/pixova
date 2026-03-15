// ============================================
// POST /api/v1/galleries/[bookingId]/init
// Create gallery for booking if not exists
// ============================================

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { generateGallerySlug } from "@/lib/gallery";

interface Params {
  params: { bookingId: string };
}

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { bookingId } = params;
    const supabase = createSupabaseAdmin();

    // Verify booking belongs to photographer
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, booking_ref, title, photographer_id")
      .eq("id", bookingId)
      .eq("photographer_id", session.photographerId)
      .single();

    if (!booking) return notFoundResponse("Booking not found");

    // Check if gallery already exists
    const { data: existing } = await supabase
      .from("galleries")
      .select("*")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existing) {
      return successResponse({ gallery: existing });
    }

    // Get studio for slug generation
    const { data: studio } = await supabase
      .from("studio_profiles")
      .select("id, name")
      .eq("photographer_id", session.photographerId)
      .single();

    if (!studio) return notFoundResponse("Studio not found");

    // Generate slug with collision handling
    const baseSlug = generateGallerySlug(
      studio.name,
      booking.booking_ref || bookingId.slice(0, 8)
    );
    let slug = baseSlug;
    let attempt = 0;

    while (true) {
      const { data: slugCheck } = await supabase
        .from("galleries")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!slugCheck) break;
      attempt++;
      slug = `${baseSlug}-${attempt + 1}`;
    }

    // Create gallery
    const { data: gallery, error } = await supabase
      .from("galleries")
      .insert({
        photographer_id: session.photographerId,
        booking_id: bookingId,
        title: booking.title,
        slug,
        status: "draft",
      })
      .select("*")
      .single();

    if (error) {
      console.error("[POST /galleries/init] Insert error:", error.message);
      return serverErrorResponse();
    }

    return successResponse({ gallery }, 201);
  } catch (err) {
    console.error("[POST /galleries/init] Error:", err);
    return serverErrorResponse();
  }
}
