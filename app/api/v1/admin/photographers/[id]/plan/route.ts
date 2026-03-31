export const dynamic = 'force-dynamic';

// ============================================
// PATCH /api/v1/admin/photographers/[id]/plan
// Admin: change photographer plan immediately
// ============================================

import { NextRequest } from 'next/server';
import { getAdminSession, logSubscriptionEvent } from '@/lib/adminAuth';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  notFoundResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { z } from 'zod';

const planSchema = z.object({
  plan_name: z.enum(['TRIAL', 'STARTER', 'PRO', 'STUDIO']),
  notes: z.string().optional(),
});

type RouteParams = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const admin = await getAdminSession();
  if (!admin) return unauthorizedResponse('Admin access required');

  const { id } = params;
  const body = await request.json();
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Invalid input');

  const { plan_name, notes } = parsed.data;
  const supabase = createSupabaseAdmin();

  // Get current subscription
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('id, status, plan_id, bookings_this_cycle, plans(name)')
    .eq('photographer_id', id)
    .single() as { data: { id: string; status: string; plan_id: string; bookings_this_cycle: number; plans: { name: string } } | null };

  if (!currentSub) return notFoundResponse('Subscription not found');

  // Get new plan
  const { data: newPlan } = await supabase
    .from('plans')
    .select('id, name, price_monthly')
    .ilike('name', plan_name)
    .single();

  if (!newPlan) return errorResponse(`Plan ${plan_name} not found`, 404);

  const oldPlanName = (currentSub.plans as { name: string } | null)?.name ?? 'UNKNOWN';
  const isUpgrade = ['STARTER', 'PRO', 'STUDIO'].indexOf(plan_name) >
    ['STARTER', 'PRO', 'STUDIO'].indexOf(oldPlanName);

  // Calculate new period
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Update subscription
  const { error: updateErr } = await supabase
    .from('subscriptions')
    .update({
      plan_id: newPlan.id,
      status: plan_name === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      grace_period_ends_at: null,
      // Reset bookings on upgrade, carry over on downgrade
      bookings_this_cycle: isUpgrade ? 0 : currentSub.bookings_this_cycle,
      updated_at: now.toISOString(),
    })
    .eq('photographer_id', id);

  if (updateErr) {
    console.error('[admin/plan]', updateErr);
    return serverErrorResponse('Failed to update plan');
  }

  // Get studio
  const { data: studio } = await supabase
    .from('studio_profiles')
    .select('id')
    .eq('photographer_id', id)
    .single();

  await logSubscriptionEvent({
    photographerId: id,
    studioId: studio?.id,
    eventType: 'PLAN_CHANGED_BY_ADMIN',
    oldPlan: oldPlanName,
    newPlan: plan_name,
    oldStatus: currentSub.status,
    newStatus: plan_name === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
    notes,
    performedBy: admin.email,
  });

  return successResponse({ updated: true, plan: plan_name });
}
