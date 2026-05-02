// ============================================
// POST /api/v1/account/saved/[studioId] — Save studio
// DELETE /api/v1/account/saved/[studioId] — Unsave
// Auth: pixova_account_session
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import {
  successResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getClientAccountSession } from '@/lib/clientAuth';

export async function POST(
  _request: NextRequest,
  { params }: { params: { studioId: string } }
) {
  try {
    const session = await getClientAccountSession();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    // Verify studio exists
    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id')
      .eq('id', params.studioId)
      .single();
    if (!studio) return notFoundResponse('Studio not found');

    // Upsert saved
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('saved_studios') as any)
      .upsert(
        { account_id: session.accountId, studio_id: params.studioId },
        { onConflict: 'account_id,studio_id', ignoreDuplicates: true }
      );

    return successResponse({ saved: true, studio_id: params.studioId });
  } catch (err) {
    console.error('[account/saved] POST error:', err);
    return serverErrorResponse();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { studioId: string } }
) {
  try {
    const session = await getClientAccountSession();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('saved_studios') as any)
      .delete()
      .eq('account_id', session.accountId)
      .eq('studio_id', params.studioId);

    return successResponse({ saved: false, studio_id: params.studioId });
  } catch (err) {
    console.error('[account/saved] DELETE error:', err);
    return serverErrorResponse();
  }
}
