export const dynamic = 'force-dynamic';

import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getClientSession } from '@/lib/clientAuth';

export async function GET() {
  try {
    const session = await getClientSession();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    const { data: agreement } = await supabase
      .from('agreements')
      .select('agreement_id, agreement_ref, agreement_data, pdf_url, status, generated_at')
      .eq('booking_id', session.bookingId)
      .single();

    if (!agreement) {
      return notFoundResponse('No agreement found for this booking.');
    }

    return successResponse({ agreement });
  } catch (err) {
    console.error('[portal] agreement error:', err);
    return serverErrorResponse();
  }
}
