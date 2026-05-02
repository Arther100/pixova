// ============================================
// GET /api/v1/account/dashboard
// Auth: pixova_account_session
// Unified client dashboard data
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import {
  successResponse, unauthorizedResponse, serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getClientAccountSession } from '@/lib/clientAuth';

const R2_PUBLIC = process.env.R2_PUBLIC_URL ?? '';

function photoUrl(key: string | null): string | null {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  return `${R2_PUBLIC}/${key}`;
}

export async function GET(_request: NextRequest) {
  try {
    const accountSession = await getClientAccountSession();
    if (!accountSession) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    // ── Get account details ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: account } = await (supabase.from('client_accounts') as any)
      .select('account_id, phone, name, city, email')
      .eq('account_id', accountSession.accountId)
      .single();

    if (!account) return unauthorizedResponse();

    const phone = account.phone;

    // ── Find all clients rows with this phone ──
    const { data: clientRows } = await supabase
      .from('clients')
      .select('id, photographer_id')
      .eq('phone', phone);

    const clientIds = (clientRows || []).map((c: { id: string }) => c.id);
    const photographerIds = Array.from(new Set(
      (clientRows || []).map((c: { photographer_id: string }) => c.photographer_id)
    ));

    // ── Fetch all bookings for those clients ──
    const now = new Date().toISOString();
    const today = new Date().toISOString().split('T')[0];

    const { data: allBookings } = clientIds.length
      ? await supabase
          .from('bookings')
          .select(
            'id, booking_ref, title, event_type, event_date, status, ' +
            'balance_amount, total_amount, paid_amount, portal_token, ' +
            'photographer_id, client_id'
          )
          .in('client_id', clientIds)
          .neq('status', 'cancelled')
          .order('event_date', { ascending: true })
      : { data: [] };

    // ── Get studio info for photographers ──
    const { data: studioProfiles } = photographerIds.length
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? await (supabase.from('studio_profiles') as any)
          .select('id, name, slug, photographer_id')
          .in('photographer_id', photographerIds)
      : { data: [] };

    const studioByPhotographer: Record<string, { name: string; slug: string; id: string }> = {};
    for (const s of (studioProfiles || []) as Array<{ id: string; name: string; slug: string; photographer_id: string }>) {
      studioByPhotographer[s.photographer_id] = { name: s.name, slug: s.slug, id: s.id };
    }

    // ── Separate upcoming and past bookings ──
    const upcoming: unknown[] = [];
    const past: unknown[] = [];
    let totalSpent = 0;

    for (const b of (allBookings || []) as unknown as Array<Record<string, unknown>>) {
      const studio = studioByPhotographer[b.photographer_id as string];
      totalSpent += (b.paid_amount as number) || 0;

      // Check if gallery exists
      const { data: gallery } = await supabase
        .from('galleries')
        .select('id, status')
        .eq('booking_id', b.id as string)
        .single();

      // Check if agreement exists
      const { data: agreement } = await supabase
        .from('agreements')
        .select('agreement_id')
        .eq('booking_id', b.id as string)
        .single();

      const bookingData = {
        booking_id:    b.id as string,
        booking_ref:   b.booking_ref as string | null,
        studio_name:   studio?.name || 'Unknown',
        studio_slug:   studio?.slug || '',
        event_type:    b.event_type as string | null,
        event_date:    b.event_date as string | null,
        title:         b.title as string,
        status:        b.status as string,
        balance_amount: b.balance_amount as number,
        has_gallery:   !!gallery && (gallery as { status: string }).status === 'published',
        has_agreement: !!agreement,
        portal_token:  b.portal_token as string | null,
      };

      if ((b.event_date as string) && (b.event_date as string) >= today) {
        upcoming.push(bookingData);
      } else {
        past.push(bookingData);
      }
    }

    // ── Active enquiries ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: enquiries } = await (supabase.from('enquiries') as any)
      .select('enquiry_id, event_type, event_date, created_at, status')
      .eq('client_phone', phone)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(10);

    const activeEnquiries = [];
    for (const enq of enquiries || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: studiosCount } = await (supabase.from('enquiry_studios') as any)
        .select('id', { count: 'exact', head: true })
        .eq('enquiry_id', enq.enquiry_id);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count: repliesCount } = await (supabase.from('enquiry_studios') as any)
        .select('id', { count: 'exact', head: true })
        .eq('enquiry_id', enq.enquiry_id)
        .in('status', ['REPLIED', 'ACCEPTED', 'CONVERTED']);

      activeEnquiries.push({
        enquiry_id: enq.enquiry_id,
        event_type: enq.event_type,
        event_date: enq.event_date,
        created_at: enq.created_at,
        studios_count: studiosCount ?? 0,
        replies_count: repliesCount ?? 0,
      });
    }

    // ── Saved studios ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: saved } = await (supabase.from('saved_studios') as any)
      .select('studio_id')
      .eq('account_id', accountSession.accountId)
      .limit(20);

    const savedStudioIds = (saved || []).map((s: { studio_id: string }) => s.studio_id);

    const { data: savedStudioProfiles } = savedStudioIds.length
      ? await supabase
          .from('studio_profiles')
          .select('id, name, slug, avg_rating, cover_url, city')
          .in('id', savedStudioIds)
      : { data: [] };

    const savedStudios = (savedStudioProfiles || []).map((s: Record<string, unknown>) => ({
      studio_id:    s.id,
      studio_name:  s.name,
      studio_slug:  s.slug,
      avg_rating:   s.avg_rating,
      city:         s.city,
      cover_photo_url: photoUrl(s.cover_url as string | null),
    }));

    // ── Stats ──
    const { count: totalPhotos } = await supabase
      .from('gallery_photos')
      .select('id', { count: 'exact', head: true })
      .in('photographer_id', photographerIds)
      .eq('client_favourited', true)
      .is('deleted_at', null);

    return successResponse({
      account: {
        name: account.name,
        phone: account.phone,
        city: account.city,
        email: account.email,
      },
      upcoming_bookings: upcoming,
      past_bookings: past,
      active_enquiries: activeEnquiries,
      saved_studios: savedStudios,
      stats: {
        total_bookings: (allBookings || []).length,
        total_spent: totalSpent,
        total_photos: totalPhotos ?? 0,
      },
    });
  } catch (err) {
    console.error('[account/dashboard] GET error:', err);
    return serverErrorResponse();
  }
}
