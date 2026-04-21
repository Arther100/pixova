export const dynamic = 'force-dynamic';

// ============================================
// PATCH /api/v1/admin/photographers/[id]/suspend
// Admin: suspend photographer account
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
import { sendAndLog } from '@/lib/notifications';
import { formatMobile } from '@/lib/whatsapp';
import { z } from 'zod';

const suspendSchema = z.object({
  reason: z.string().min(3, 'Reason is required'),
});

type RouteParams = { params: { id: string } };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const admin = await getAdminSession();
  if (!admin) return unauthorizedResponse('Admin access required');

  const { id } = params;
  const body = await request.json();
  const parsed = suspendSchema.safeParse(body);
  if (!parsed.success) return errorResponse(parsed.error.issues[0]?.message || 'Invalid input');

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('photographers')
    .update({
      is_suspended: true,
      suspended_at: new Date().toISOString(),
      suspended_reason: parsed.data.reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return serverErrorResponse('Failed to suspend account');

  const { data: studio } = await supabase
    .from('studio_profiles')
    .select('id, phone, name')
    .eq('photographer_id', id)
    .single();

  await logSubscriptionEvent({
    photographerId: id,
    studioId: studio?.id,
    eventType: 'ACCOUNT_SUSPENDED',
    notes: parsed.data.reason,
    performedBy: admin.email,
  });

  // Notify photographer via WhatsApp (fire-and-forget)
  if (studio?.phone) {
    sendAndLog({
      studioId: studio.id,
      recipientMobile: formatMobile(studio.phone),
      recipientType: 'PHOTOGRAPHER',
      campaignName: 'account_suspended',
      userName: studio.name,
      templateParams: [studio.name, parsed.data.reason, 'support@pixova.in'],
    }).catch(console.error);
  }

  return successResponse({ suspended: true });
}
