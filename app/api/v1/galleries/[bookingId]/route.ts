// ============================================
// GET + PATCH /api/v1/galleries/[bookingId]
// Get or update gallery settings
// ============================================

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import { notifyGalleryPublished } from "@/lib/notifications";

interface Params {
  params: { bookingId: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { bookingId } = params;
    const supabase = createSupabaseAdmin();

    const { data: gallery } = await supabase
      .from("galleries")
      .select("*")
      .eq("booking_id", bookingId)
      .eq("photographer_id", session.photographerId)
      .maybeSingle();

    if (!gallery) return notFoundResponse("Gallery not found");

    return successResponse({ gallery });
  } catch (err) {
    console.error("[GET /galleries] Error:", err);
    return serverErrorResponse();
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const { bookingId } = params;
    const body = await request.json();
    const supabase = createSupabaseAdmin();

    // Find gallery
    const { data: existing } = await supabase
      .from("galleries")
      .select("id, photographer_id, status")
      .eq("booking_id", bookingId)
      .eq("photographer_id", session.photographerId)
      .maybeSingle();

    if (!existing) return notFoundResponse("Gallery not found");

    // Build safe update
    const allowed: Record<string, unknown> = {};
    if (typeof body.title === "string") allowed.title = body.title;
    if (typeof body.description === "string") allowed.description = body.description;
    if (typeof body.allow_download === "boolean") allowed.allow_download = body.allow_download;
    if (typeof body.allow_selection === "boolean") allowed.allow_selection = body.allow_selection;
    if (typeof body.selection_limit === "number") allowed.selection_limit = body.selection_limit;
    if (typeof body.pin === "string" || body.pin === null) allowed.pin = body.pin;
    if (typeof body.watermark_enabled === "boolean") allowed.watermark_enabled = body.watermark_enabled;
    if (typeof body.expires_at === "string" || body.expires_at === null) allowed.expires_at = body.expires_at;
    if (typeof body.cover_photo_url === "string") allowed.cover_photo_url = body.cover_photo_url;

    // Status transitions
    if (body.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ["published"],
        published: ["archived"],
        archived: ["published"],
      };

      const currentStatus = existing.status;
      const nextStatus = body.status;
      const validNext = validTransitions[currentStatus] || [];

      if (!validNext.includes(nextStatus)) {
        return errorResponse(
          `Cannot change status from "${currentStatus}" to "${nextStatus}"`
        );
      }

      allowed.status = nextStatus;
      if (nextStatus === "published" && !existing.status?.includes("published")) {
        allowed.published_at = new Date().toISOString();
      }
    }

    // Track old status for notification logic
    const oldStatus = existing.status;

    if (Object.keys(allowed).length === 0) {
      return errorResponse("No valid fields to update");
    }

    allowed.updated_at = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("galleries")
      .update(allowed)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) {
      console.error("[PATCH /galleries] Error:", error.message);
      return serverErrorResponse();
    }

    // NOTIFICATION: Gallery published (fire-and-forget)
    const updatedGallery = updated as Record<string, unknown> | null;
    if (updatedGallery?.status === 'published' && oldStatus !== 'published') {
      // Fetch booking + client for notification
      const { data: bookingForNotif } = await supabase
        .from('bookings')
        .select('id, booking_ref, client_id')
        .eq('id', bookingId)
        .eq('photographer_id', session.photographerId)
        .single();

      if (bookingForNotif) {
        const { data: clientForNotif } = await supabase
          .from('clients')
          .select('name, phone')
          .eq('id', bookingForNotif.client_id)
          .single();

        const { data: studioForNotif } = await supabase
          .from('studio_profiles')
          .select('id, name')
          .eq('photographer_id', session.photographerId)
          .single();

        if (clientForNotif && studioForNotif && updatedGallery?.slug) {
          const { count } = await supabase
            .from('gallery_photos')
            .select('*', { count: 'exact', head: true })
            .eq('gallery_id', updatedGallery.id as string);

          notifyGalleryPublished({
            studioId: studioForNotif.id,
            bookingId: bookingForNotif.id,
            bookingRef: bookingForNotif.booking_ref || bookingForNotif.id.slice(0, 8).toUpperCase(),
            clientName: clientForNotif.name,
            clientMobile: clientForNotif.phone,
            studioName: studioForNotif.name,
            gallerySlug: updatedGallery.slug as string,
            photoCount: count ?? 0,
          }).catch(err => console.error('[notify gallery published]', err));
        }
      }
    }

    return successResponse({ gallery: updated });
  } catch (err) {
    console.error("[PATCH /galleries] Error:", err);
    return serverErrorResponse();
  }
}
