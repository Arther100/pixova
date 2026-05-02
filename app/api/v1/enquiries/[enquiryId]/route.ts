// ============================================
// GET /api/v1/enquiries/[enquiryId]
// Auth: pixova_account_session OR photographer JWT
// Returns enquiry with studio responses
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import {
  successResponse, unauthorizedResponse, notFoundResponse, serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getClientAccountSession } from '@/lib/clientAuth';
import { getSessionFromCookie } from '@/lib/session';

export async function GET(
  _request: NextRequest,
  { params }: { params: { enquiryId: string } }
) {
  try {
    const { enquiryId } = params;
    const supabase = createSupabaseAdmin();

    // ── Auth: client account OR photographer ──
    const accountSession = await getClientAccountSession();
    const photographerSession = await getSessionFromCookie();

    if (!accountSession && !photographerSession) return unauthorizedResponse();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enquiry, error } = await (supabase.from('enquiries') as any)
      .select('*')
      .eq('enquiry_id', enquiryId)
      .single();

    if (error || !enquiry) return notFoundResponse('Enquiry not found');

    // ── Access control ──
    if (accountSession) {
      // Must match phone
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: account } = await (supabase.from('client_accounts') as any)
        .select('phone')
        .eq('account_id', accountSession.accountId)
        .single();
      if (!account || account.phone !== enquiry.client_phone) return unauthorizedResponse();
    } else if (photographerSession) {
      // Must own a studio that received this enquiry
      const { data: studio } = await supabase
        .from('studio_profiles')
        .select('id')
        .eq('photographer_id', photographerSession.photographerId)
        .single();
      if (!studio) return unauthorizedResponse();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: es } = await (supabase.from('enquiry_studios') as any)
        .select('id')
        .eq('enquiry_id', enquiryId)
        .eq('studio_id', studio.id)
        .single();
      if (!es) return unauthorizedResponse();
    }

    // ── Fetch studio responses ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: studioRows } = await (supabase.from('enquiry_studios') as any)
      .select('id, studio_id, status, quote_amount, quote_note, replied_at, seen_at, created_at')
      .eq('enquiry_id', enquiryId);

    // Enrich with studio info
    const studioIds = (studioRows || []).map((r: { studio_id: string }) => r.studio_id);
    const { data: studioProfiles } = studioIds.length
      ? await supabase
          .from('studio_profiles')
          .select('id, name, slug, avg_rating, cover_url, city')
          .in('id', studioIds)
      : { data: [] };

    const profileMap: Record<string, Record<string, unknown>> = {};
    for (const p of studioProfiles || []) profileMap[p.id] = p;

    const R2_PUBLIC = process.env.R2_PUBLIC_URL ?? '';
    const responses = (studioRows || []).map((r: Record<string, unknown>) => {
      const profile = profileMap[r.studio_id as string] || {};
      const coverKey = profile.cover_url as string | null;
      return {
        ...r,
        studio_name: profile.name,
        studio_slug: profile.slug,
        avg_rating:  profile.avg_rating,
        city:        profile.city,
        cover_photo_url: coverKey
          ? (coverKey.startsWith('http') ? coverKey : `${R2_PUBLIC}/${coverKey}`)
          : null,
      };
    });

    return successResponse({ enquiry, responses });
  } catch (err) {
    console.error('[enquiries/[id]] GET error:', err);
    return serverErrorResponse();
  }
}
