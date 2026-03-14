// ============================================
// GET /api/v1/agreements/[agreementId]/pdf
// Generates PDF lazily on first request, caches in R2
// Returns signed URL for download
// Marks client_viewed_at on first access
export const dynamic = 'force-dynamic';
// ============================================

import { createSupabaseAdmin } from "@/lib/supabase";
import { uploadToR2, getPresignedDownloadUrl, agreementPdfKey } from "@/lib/r2";
import {
  successResponse,
  notFoundResponse,
  errorResponse,
} from "@/lib/api-helpers";
import type { AgreementSnapshot } from "@/types";

interface Params {
  params: { agreementId: string };
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const { agreementId } = params;
    const supabase = createSupabaseAdmin();

    const { data: agreement, error } = await supabase
      .from("agreements")
      .select("agreement_id, studio_id, pdf_r2_key, client_viewed_at, status, agreement_data")
      .eq("agreement_id", agreementId)
      .single();

    if (error || !agreement) {
      return notFoundResponse("Agreement not found");
    }

    let r2Key = agreement.pdf_r2_key;

    // Generate PDF lazily if not yet created
    if (!r2Key) {
      try {
        const snapshot = agreement.agreement_data as unknown as AgreementSnapshot;
        const React = (await import("react")).default;
        const { renderToBuffer } = await import("@react-pdf/renderer");
        const { AgreementPDF } = await import("@/lib/pdf/AgreementPDF");

        /* eslint-disable @typescript-eslint/no-explicit-any */
        const pdfElement = React.createElement(AgreementPDF as any, { data: snapshot });
        const pdfBuffer = await renderToBuffer(pdfElement as any);
        /* eslint-enable @typescript-eslint/no-explicit-any */

        r2Key = agreementPdfKey(agreement.studio_id, agreementId);
        await uploadToR2(r2Key, Buffer.from(pdfBuffer), "application/pdf");

        // Save R2 key so future requests skip generation
        await supabase
          .from("agreements")
          .update({ pdf_r2_key: r2Key })
          .eq("agreement_id", agreementId);
      } catch (pdfErr) {
        console.error("[GET /agreements/:id/pdf] PDF generation error:", pdfErr);
        return errorResponse("PDF generation failed. Please try again.", 500);
      }
    }

    // Generate signed URL (15 min expiry)
    const url = await getPresignedDownloadUrl(r2Key, 900);

    return successResponse({ url, expires_in: 900 });
  } catch (err) {
    console.error("[GET /agreements/:id/pdf] Unexpected error:", err);
    return errorResponse("Failed to get PDF", 500);
  }
}
