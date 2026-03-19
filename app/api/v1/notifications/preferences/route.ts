// ============================================
// GET   /api/v1/notifications/preferences — Get preferences
// PATCH /api/v1/notifications/preferences — Update preferences
// Auth: Photographer JWT
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { getSessionFromCookie } from '@/lib/session';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';

const DEFAULTS = {
  notify_booking_confirmed: true,
  notify_payment_received: true,
  notify_agreement_ready: true,
  notify_gallery_published: true,
  notify_payment_link: true,
  notify_event_reminder: true,
  reminder_hours_before: 24,
};

const ALLOWED_KEYS = [
  'notify_booking_confirmed',
  'notify_payment_received',
  'notify_agreement_ready',
  'notify_gallery_published',
  'notify_payment_link',
  'notify_event_reminder',
  'reminder_hours_before',
];

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id')
      .eq('photographer_id', session.photographerId)
      .single();

    if (!studio) return unauthorizedResponse();

    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('studio_id', studio.id)
      .single();

    return successResponse({
      preferences: data || { studio_id: studio.id, ...DEFAULTS },
    });
  } catch (err) {
    console.error('[preferences] GET error:', err);
    return serverErrorResponse();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const body = await request.json();
    const supabase = createSupabaseAdmin();

    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id')
      .eq('photographer_id', session.photographerId)
      .single();

    if (!studio) return unauthorizedResponse();

    // Build safe update from allowed keys only
    const update: Record<string, unknown> = {};
    for (const key of ALLOWED_KEYS) {
      if (key in body) {
        if (key === 'reminder_hours_before') {
          const val = parseInt(body[key], 10);
          if ([12, 24, 48].includes(val)) {
            update[key] = val;
          }
        } else if (typeof body[key] === 'boolean') {
          update[key] = body[key];
        }
      }
    }

    if (Object.keys(update).length === 0) {
      return errorResponse('No valid preferences to update');
    }

    update.updated_at = new Date().toISOString();

    // Upsert
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        { studio_id: studio.id, ...DEFAULTS, ...update },
        { onConflict: 'studio_id' }
      )
      .select('*')
      .single();

    if (error) {
      console.error('[preferences] upsert error:', error);
      return serverErrorResponse();
    }

    return successResponse({ preferences: data });
  } catch (err) {
    console.error('[preferences] PATCH error:', err);
    return serverErrorResponse();
  }
}
