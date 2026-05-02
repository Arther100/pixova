// ============================================
// GET /api/v1/explore — Marketplace search
// Auth: PUBLIC
// Cache: 60 seconds
// ============================================

export const revalidate = 60;

import { NextRequest } from 'next/server';
import { successResponse, serverErrorResponse } from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';

const R2_PUBLIC = process.env.R2_PUBLIC_URL ?? '';

function photoUrl(key: string | null): string | null {
  if (!key) return null;
  if (key.startsWith('http')) return key;
  return `${R2_PUBLIC}/${key}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city         = searchParams.get('city')?.trim();
    const specialization = searchParams.get('specialization')?.trim();
    const minPrice     = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : null;
    const maxPrice     = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null;
    const date         = searchParams.get('date'); // YYYY-MM-DD
    const rating       = searchParams.get('rating') ? Number(searchParams.get('rating')) : null;
    const sort         = searchParams.get('sort') || 'default';
    const page         = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit        = Math.min(parseInt(searchParams.get('limit') || '12', 10), 24);
    const featured     = searchParams.get('featured') === 'true';
    const offset       = (page - 1) * limit;

    const supabase = createSupabaseAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('studio_profiles') as any)
      .select(
        'id, name, slug, tagline, city, state, specializations, starting_price, ' +
        'avg_rating, cover_url, featured, years_experience, ' +
        'review_count, is_verified, profile_complete',
        { count: 'exact' }
      )
      .eq('is_listed', true)
      .eq('profile_complete', true);

    if (city)           query = query.ilike('city', city);
    if (specialization) query = query.contains('specializations', [specialization]);
    if (minPrice != null) query = query.gte('starting_price', minPrice);
    if (maxPrice != null) query = query.lte('starting_price', maxPrice);
    if (rating != null) query = query.gte('avg_rating', rating);
    if (featured)       query = query.eq('featured', true);

    // Date availability filter: exclude studios booked on that date
    if (date) {
      // Get unavailable photographer IDs
      const { data: bookedBlocks } = await supabase
        .from('calendar_blocks')
        .select('photographer_id')
        .lte('start_date', date)
        .gte('end_date', date)
        .in('status', ['BOOKED', 'BLOCKED']);

      const unavailablePhotographerIds = Array.from(new Set(
        (bookedBlocks || []).map((b: { photographer_id: string }) => b.photographer_id)
      ));

      if (unavailablePhotographerIds.length > 0) {
        // Get studio IDs for those photographers to exclude
        const { data: unavailableStudios } = await supabase
          .from('studio_profiles')
          .select('id')
          .in('photographer_id', unavailablePhotographerIds);

        const unavailableStudioIds = (unavailableStudios || []).map(
          (s: { id: string }) => s.id
        );

        if (unavailableStudioIds.length > 0) {
          query = query.not('id', 'in', `(${unavailableStudioIds.join(',')})`);
        }
      }
    }

    // Apply sort
    switch (sort) {
      case 'rating':
        query = query.order('avg_rating', { ascending: false })
                     .order('review_count', { ascending: false });
        break;
      case 'price_asc':
        query = query.order('starting_price', { ascending: true, nullsFirst: false });
        break;
      case 'price_desc':
        query = query.order('starting_price', { ascending: false, nullsFirst: false });
        break;
      case 'newest':
        query = query.order('created_at', { ascending: false });
        break;
      default:
        query = query.order('featured', { ascending: false })
                     .order('avg_rating', { ascending: false })
                     .order('review_count', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: studios, count, error } = await query;

    if (error) {
      console.error('[explore] query error:', error);
      return serverErrorResponse();
    }

    const results = (studios || []).map((s: Record<string, unknown>) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      tagline: s.tagline,
      city: s.city,
      state: s.state,
      specializations: s.specializations,
      starting_price: s.starting_price,
      avg_rating: s.avg_rating,
      review_count: s.review_count ?? 0,
      years_experience: s.years_experience ?? 0,
      is_verified: s.is_verified,
      featured: s.featured,
      cover_photo_url: photoUrl(s.cover_url as string | null),
    }));

    return successResponse({
      studios: results,
      total: count ?? 0,
      page,
      total_pages: Math.ceil((count ?? 0) / limit),
      filters_applied: {
        city: city || null,
        specialization: specialization || null,
        min_price: minPrice,
        max_price: maxPrice,
        date: date || null,
        rating,
        featured: featured || null,
      },
    });
  } catch (err) {
    console.error('[explore] GET error:', err);
    return serverErrorResponse();
  }
}
