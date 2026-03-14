// ============================================
// GET /api/v1/agreements — List all agreements for studio
// Supports ?booking_id= filter for single booking lookup
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const bookingIdFilter = searchParams.get("booking_id");

    // Get studio ID
    const { data: studio } = await supabase
      .from("studio_profiles")
      .select("id")
      .eq("photographer_id", session.photographerId)
      .single();

    if (!studio) return successResponse({ agreements: [] });

    let query = supabase
      .from("agreements")
      .select("agreement_id, agreement_ref, booking_id, status, client_viewed_at, generated_at, agreement_data")
      .eq("studio_id", studio.id)
      .order("generated_at", { ascending: false });

    if (bookingIdFilter) {
      query = query.eq("booking_id", bookingIdFilter);
    }

    const { data: agreements, error } = await query;

    if (error) {
      console.error("[GET /agreements] Query error:", error.message);
      return serverErrorResponse();
    }

    // Map to lightweight response
    const mapped = (agreements || []).map((a) => {
      const data = a.agreement_data as Record<string, unknown> | null;
      return {
        agreement_id: a.agreement_id,
        agreement_ref: a.agreement_ref,
        booking_id: a.booking_id,
        booking_ref: data?.booking_ref || null,
        client_name: data?.client_name || null,
        event_type: data?.event_type || null,
        event_date: data?.event_date || null,
        status: a.status,
        client_viewed_at: a.client_viewed_at,
        generated_at: a.generated_at,
      };
    });

    return successResponse({ agreements: mapped });
  } catch (err) {
    console.error("[GET /agreements] Unexpected error:", err);
    return serverErrorResponse();
  }
}
