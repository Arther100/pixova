// ============================================
// GET  /api/v1/settings/profile — Get studio profile
// PATCH /api/v1/settings/profile — Update studio profile
// Auth: Photographer JWT
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';

const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  tagline: z.string().max(200).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  state: z.string().max(100).nullable().optional(),
  pincode: z.string().max(10).nullable().optional(),
  gstin: z
    .string()
    .max(15)
    .nullable()
    .optional()
    .refine(
      (v) => !v || /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v),
      { message: 'Invalid GSTIN format' }
    ),
  specializations: z.array(z.string()).max(10).optional(),
  languages: z.array(z.string()).max(10).optional(),
  starting_price: z.number().nonnegative().nullable().optional(),
  is_listed: z.boolean().optional(),
  years_experience: z.number().int().nonnegative().nullable().optional(),
  instagram: z.string().max(100).nullable().optional(),
  website: z.string().url().nullable().optional().or(z.literal('').transform(() => null)),
});

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile, error } = await (supabase as any)
      .from('studio_profiles')
      .select(
        'id, name, slug, tagline, bio, phone, email, city, state, pincode, gstin, ' +
        'specializations, languages, starting_price, is_listed, is_verified, avg_rating, ' +
        'total_bookings, cover_url, years_experience, instagram, website, profile_complete'
      )
      .eq('photographer_id', session.photographerId)
      .single();

    if (error || !profile) return notFoundResponse('Studio profile not found');

    // Enrich with counts
    const [{ count: packageCount }, { count: portfolioCount }] = await Promise.all([
      supabase
        .from('packages')
        .select('id', { count: 'exact', head: true })
        .eq('studio_id', (profile as { id: string }).id)
        .eq('is_active', true),
      supabase
        .from('gallery_photos')
        .select('id', { count: 'exact', head: true })
        .eq('photographer_id', session.photographerId)
        .eq('show_in_portfolio', true),
    ]);

    return successResponse({ profile: { ...(profile as object), package_count: packageCount ?? 0, portfolio_count: portfolioCount ?? 0 } });
  } catch (err) {
    console.error('[settings/profile] GET error:', err);
    return serverErrorResponse();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || 'Invalid input');
    }

    const supabase = createSupabaseAdmin();

    // Build update payload — only include fields that were sent
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (parsed.data.name !== undefined) update.name = parsed.data.name;
    if (parsed.data.tagline !== undefined) update.tagline = parsed.data.tagline;
    if (parsed.data.bio !== undefined) update.bio = parsed.data.bio;
    if (parsed.data.city !== undefined) update.city = parsed.data.city;
    if (parsed.data.state !== undefined) update.state = parsed.data.state;
    if (parsed.data.pincode !== undefined) update.pincode = parsed.data.pincode;
    if (parsed.data.gstin !== undefined) update.gstin = parsed.data.gstin;
    if (parsed.data.specializations !== undefined) update.specializations = parsed.data.specializations;
    if (parsed.data.languages !== undefined) update.languages = parsed.data.languages;
    if (parsed.data.starting_price !== undefined) update.starting_price = parsed.data.starting_price;
    if (parsed.data.is_listed !== undefined) update.is_listed = parsed.data.is_listed;
    if (parsed.data.years_experience !== undefined) update.years_experience = parsed.data.years_experience;
    if (parsed.data.instagram !== undefined) update.instagram = parsed.data.instagram;
    if (parsed.data.website !== undefined) update.website = parsed.data.website;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error } = await (supabase as any)
      .from('studio_profiles')
      .update(update)
      .eq('photographer_id', session.photographerId)
      .select(
        'id, name, slug, tagline, bio, phone, email, city, state, pincode, gstin, ' +
        'specializations, languages, starting_price, is_listed, cover_url, ' +
        'years_experience, instagram, website, profile_complete'
      )
      .single();

    if (error || !updated) {
      console.error('[settings/profile] PATCH error:', error);
      return serverErrorResponse('Failed to update profile');
    }

    const u = updated as Record<string, unknown>;

    // Auto-compute profile_complete after save
    // Requires: name + bio (≥50 chars) + city. Packages/portfolio shown in checklist but don't block listing.
    const [{ count: packageCount }, { count: portfolioCount }] = await Promise.all([
      supabase
        .from('packages')
        .select('id', { count: 'exact', head: true })
        .eq('studio_id', u.id as string)
        .eq('is_active', true),
      supabase
        .from('gallery_photos')
        .select('id', { count: 'exact', head: true })
        .eq('photographer_id', session.photographerId)
        .eq('show_in_portfolio', true),
    ]);

    const bioOk = typeof u.bio === 'string' && u.bio.length >= 50;
    const isComplete = !!(u.name && bioOk && u.city);

    if (isComplete !== u.profile_complete) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('studio_profiles')
        .update({ profile_complete: isComplete })
        .eq('id', u.id);
    }

    return successResponse({
      profile: {
        ...u,
        profile_complete: isComplete,
        package_count: packageCount ?? 0,
        portfolio_count: portfolioCount ?? 0,
      },
    });
  } catch (err) {
    console.error('[settings/profile] PATCH error:', err);
    return serverErrorResponse();
  }
}
