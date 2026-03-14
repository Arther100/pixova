export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/api-helpers";
import { createSupabaseAdmin } from "@/lib/supabase";

// GET /api/v1/gallery-photos?galleryId=xxx&page=1&limit=50
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const galleryId = searchParams.get("galleryId");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    if (!galleryId) {
      return errorResponse("galleryId is required");
    }

    const offset = (page - 1) * limit;
    const supabase = createSupabaseAdmin();

    const { data: photos, error, count } = await supabase
      .from("gallery_photos")
      .select("*", { count: "exact" })
      .eq("gallery_id", galleryId)
      .order("sort_order", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[gallery-photos] DB error:", error);
      return serverErrorResponse();
    }

    return successResponse({
      items: photos || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    });
  } catch (err) {
    console.error("[gallery-photos] Unexpected error:", err);
    return serverErrorResponse();
  }
}
