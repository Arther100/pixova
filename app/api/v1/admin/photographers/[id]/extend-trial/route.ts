export const dynamic = 'force-dynamic';

// ============================================
// POST /api/v1/admin/photographers/[id]/extend-trial
// Admin: extend trial period by N days (max 30)
// ============================================

import { NextRequest } from 'next/server';
import { getAdminSession, logSubscriptionEvent } from '@/lib/adminAuth';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { z } from 'zod';

const extendSchema = z.object({
  days: z.number().int().min(1).max(30),
});

type RouteParams = { params: { id: string } };

export async function POST(request: NextRequest, { params }: RouteParams) {
  const admin = await getAdminSession();
  if (!admin) return unauthorizedResponse('Admin access required');

  const { id } = params;
  const body = await request.json();
  const parsed = extendSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Invalid input');

  const { days } = parsed.data;
  const supabase = createSupabaseAdmin();

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, current_period_end, status')
    .eq('photographer_id', id)
    .single();

  if (!sub) return errorResponse('Subscription not found', 404);

  const newEnd = new Date(sub.current_period_end);
  newEnd.setDate(newEnd.getDate() + days);

  const { error } = await supabase
    .from('subscriptions')
    .update({
      current_period_end: newEnd.toISOString(),
      status: 'TRIAL',
      grace_period_ends_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('photographer_id', id);

  if (error) return serverErrorResponse('Failed to extend trial');

  const { data: studio } = await supabase
    .from('studio_profiles')
    .select('id')
    .eq('photographer_id', id)
    .single();

  await logSubscriptionEvent({
    photographerId: id,
    studioId: studio?.id,
    eventType: 'TRIAL_STARTED',
    oldStatus: sub.status,
    newStatus: 'TRIAL',
    notes: `Trial extended by ${days} days by admin`,
    performedBy: admin.email,
  });

  return successResponse({ extended: true, new_trial_end: newEnd.toISOString() });
}
