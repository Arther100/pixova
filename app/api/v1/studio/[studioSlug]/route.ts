// ============================================
// GET /api/v1/studio/[studioSlug]
// Public profile data — no auth required
// Cache: 5 minutes
// ============================================

export const revalidate = 300;

import { NextRequest } from 'next/server';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';

const R2_PUBLIC = process.env.R2_PUBLIC_URL ?? '';

function photoUrl(key: string | null): string | null {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  return `${R2_PUBLIC}/${key}`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { studioSlug: string } }
) {
  try {
    const supabase = createSupabaseAdmin();
    const { studioSlug } = params;

    // ── Fetch studio profile ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: studio, error } = await (supabase.from('studio_profiles') as any)
      .select(
        'id, photographer_id, name, slug, tagline, bio, cover_url, city, state, ' +
        'specializations, languages, starting_price, avg_rating, total_bookings, ' +
        'is_verified, is_listed, instagram, website, ' +
        'years_experience, total_events, review_count, response_rate, featured, ' +
        'profile_complete, created_at, updated_at'
      )
      .eq('slug', studioSlug)
      .eq('is_listed', true)
      .single();

    if (error || !studio) return notFoundResponse('Studio not found');

    const studioId = studio.id;
    const photographerId = studio.photographer_id;

    // ── Parallel fetch all related data ──
    const [packagesRes, portfolioRes, reviewsRes, calendarRes] = await Promise.all([
      // 1. Active packages
      supabase
        .from('studio_packages')
        .select('id, name, description, price, deliverables, duration_hours, is_active, sort_order')
        .eq('studio_id', studioId)
        .eq('is_active', true)
        .order('price', { ascending: true }),

      // 2. Portfolio photos (max 24) — via photographer_id on gallery_photos
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('gallery_photos') as any)
        .select('id, storage_key, thumbnail_key, original_filename, gallery_id')
        .eq('photographer_id', photographerId)
        .eq('show_in_portfolio', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(24),

      // 3. Public reviews (max 10)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('client_feedback') as any)
        .select('id, rating, review_text, photographer_reply, submitted_at, event_type')
        .eq('studio_id', studioId)
        .eq('is_public', true)
        .order('submitted_at', { ascending: false })
        .limit(10),

      // 4. Blocked dates (next 60 days)
      // calendar_blocks uses photographer_id and start_date/end_date
      supabase
        .from('calendar_blocks')
        .select('start_date, end_date, status')
        .eq('photographer_id', photographerId)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .lte(
          'start_date',
          new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        )
        .in('status', ['BOOKED', 'BLOCKED']),
    ]);

    // ── Build blocked dates array (expand date ranges) ──
    const blockedDates: string[] = [];
    for (const block of calendarRes.data || []) {
      const start = new Date(block.start_date);
      const end = new Date(block.end_date);
      const cur = new Date(start);
      while (cur <= end) {
        blockedDates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
      }
    }

    // ── Build portfolio with public URLs ──
    const portfolio = (portfolioRes.data || []).map((p: {
      id: string;
      storage_key: string;
      thumbnail_key: string | null;
      original_filename: string;
      gallery_id: string;
    }) => ({
      photo_id: p.id,
      url: photoUrl(p.storage_key),
      thumbnail_url: photoUrl(p.thumbnail_key) || photoUrl(p.storage_key),
      filename: p.original_filename,
      gallery_id: p.gallery_id,
    }));

    return successResponse({
      studio: {
        id: studio.id,
        name: studio.name,
        slug: studio.slug,
        tagline: studio.tagline,
        bio: studio.bio,
        city: studio.city,
        state: studio.state,
        specializations: studio.specializations,
        languages: studio.languages,
        starting_price: studio.starting_price,
        avg_rating: studio.avg_rating,
        review_count: (studio as Record<string, unknown>).review_count ?? 0,
        total_bookings: studio.total_bookings,
        years_experience: (studio as Record<string, unknown>).years_experience ?? 0,
        total_events: (studio as Record<string, unknown>).total_events ?? 0,
        response_rate: (studio as Record<string, unknown>).response_rate ?? 100,
        featured: (studio as Record<string, unknown>).featured ?? false,
        is_verified: studio.is_verified,
        instagram_url: studio.instagram,
        website_url: studio.website,
        cover_photo_url: photoUrl(studio.cover_url),
      },
      packages: packagesRes.data || [],
      portfolio,
      reviews: reviewsRes.data || [],
      blocked_dates: Array.from(new Set(blockedDates)),
    });
  } catch (err) {
    console.error('[studio/[studioSlug]] GET error:', err);
    return serverErrorResponse();
  }
}
