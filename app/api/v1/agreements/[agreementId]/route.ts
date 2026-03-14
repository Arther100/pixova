// ============================================
// GET /api/v1/agreements/[agreementId]
// Fetch single agreement — photographer (full) or public (data only)
//
// PATCH /api/v1/agreements/[agreementId]
export const dynamic = 'force-dynamic';
// Mark agreement as viewed by client (lightweight, no PDF)
// ============================================

import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  notFoundResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";
import type { Database } from "@/types/database";

type AgreementRow = Database["public"]["Tables"]["agreements"]["Row"];

interface Params {
  params: { agreementId: string };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { agreementId } = params;
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from("agreements")
      .select("*")
      .eq("agreement_id", agreementId)
      .single();

    if (error || !data) {
      return notFoundResponse("Agreement not found");
    }

    const agreement = data as AgreementRow;

    // Check if photographer is authenticated
    const session = await getSessionFromCookie();
    const isOwner = session && agreement.studio_id;

    if (isOwner) {
      // Verify ownership
      const { data: studio } = await supabase
        .from("studio_profiles")
        .select("id")
        .eq("id", agreement.studio_id)
        .eq("photographer_id", session.photographerId)
        .maybeSingle();

      if (studio) {
        return successResponse({
          agreement_id: agreement.agreement_id,
          agreement_ref: agreement.agreement_ref,
          status: agreement.status,
          client_viewed_at: agreement.client_viewed_at,
          generated_at: agreement.generated_at,
          regenerated_at: agreement.regenerated_at,
          agreement_data: agreement.agreement_data,
          has_pdf: !!agreement.pdf_r2_key,
        });
      }
    }

    // Public access — limited data
    return successResponse({
      agreement_id: agreement.agreement_id,
      agreement_ref: agreement.agreement_ref,
      status: agreement.status,
      client_viewed_at: agreement.client_viewed_at,
      generated_at: agreement.generated_at,
      agreement_data: agreement.agreement_data,
      has_pdf: !!agreement.pdf_r2_key,
    });
  } catch (err) {
    console.error("[GET /agreements/:id] Unexpected error:", err);
    return serverErrorResponse();
  }
}

// Mark agreement as viewed (client opens the page)
export async function PATCH(_request: Request, { params }: Params) {
  try {
    const { agreementId } = params;
    const supabase = createSupabaseAdmin();

    const { data: agreement } = await supabase
      .from("agreements")
      .select("agreement_id, client_viewed_at")
      .eq("agreement_id", agreementId)
      .single();

    if (!agreement) return notFoundResponse("Agreement not found");

    // Only update on first view
    if (!agreement.client_viewed_at) {
      await supabase
        .from("agreements")
        .update({
          client_viewed_at: new Date().toISOString(),
          status: "VIEWED",
        })
        .eq("agreement_id", agreementId);
    }

    return successResponse({ viewed: true });
  } catch (err) {
    console.error("[PATCH /agreements/:id] Unexpected error:", err);
    return serverErrorResponse();
  }
}
