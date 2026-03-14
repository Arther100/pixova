// ============================================
// GET/PUT /api/v1/cancellation-policy
// Manage studio cancellation policy text
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    const { data: studio } = await supabase
      .from("studio_profiles")
      .select("id")
      .eq("photographer_id", session.photographerId)
      .single();

    if (!studio) return successResponse({ policy_text: null });

    const { data: policy } = await supabase
      .from("cancellation_policies")
      .select("policy_text")
      .eq("studio_id", studio.id)
      .maybeSingle();

    return successResponse({ policy_text: policy?.policy_text || null });
  } catch (err) {
    console.error("[GET /cancellation-policy] Error:", err);
    return serverErrorResponse();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const policyText = body?.policy_text;

    if (!policyText || typeof policyText !== "string") {
      return errorResponse("Policy text is required");
    }

    if (policyText.length > 2000) {
      return errorResponse("Policy text must be under 2000 characters");
    }

    const supabase = createSupabaseAdmin();

    const { data: studio } = await supabase
      .from("studio_profiles")
      .select("id")
      .eq("photographer_id", session.photographerId)
      .single();

    if (!studio) return errorResponse("Studio not found", 404);

    // Upsert
    const { data: result, error } = await supabase
      .from("cancellation_policies")
      .upsert(
        {
          studio_id: studio.id,
          policy_text: policyText.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "studio_id" }
      )
      .select("policy_text, updated_at")
      .single();

    if (error) {
      console.error("[PUT /cancellation-policy] Error:", error.message);
      return serverErrorResponse();
    }

    return successResponse(result);
  } catch (err) {
    console.error("[PUT /cancellation-policy] Error:", err);
    return serverErrorResponse();
  }
}
