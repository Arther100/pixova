export const dynamic = 'force-dynamic';

// ============================================
// PATCH /api/v1/admin/photographers/[id]/unsuspend
// Admin: unsuspend photographer account
// ============================================

import { NextRequest } from 'next/server';
import { getAdminSession, logSubscriptionEvent } from '@/lib/adminAuth';
import { createSupabaseAdmin } from '@/lib/supabase';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { sendAndLog } from '@/lib/notifications';
import { formatMobile } from '@/lib/whatsapp';

type RouteParams = { params: { id: string } };

export async function PATCH(_: NextRequest, { params }: RouteParams) {
  const admin = await getAdminSession();
  if (!admin) return unauthorizedResponse('Admin access required');

  const { id } = params;
  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from('photographers')
    .update({
      is_suspended: false,
      suspended_at: null,
      suspended_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) return serverErrorResponse('Failed to unsuspend account');

  const { data: studio } = await supabase
    .from('studio_profiles')
    .select('id, phone, name')
    .eq('photographer_id', id)
    .single();

  await logSubscriptionEvent({
    photographerId: id,
    studioId: studio?.id,
    eventType: 'ACCOUNT_UNSUSPENDED',
    performedBy: admin.email,
  });

  if (studio?.phone) {
    sendAndLog({
      studioId: studio.id,
      recipientMobile: formatMobile(studio.phone),
      recipientType: 'PHOTOGRAPHER',
      campaignName: 'account_reinstated',
      userName: studio.name,
      templateParams: [studio.name],
    }).catch(console.error);
  }

  return successResponse({ unsuspended: true });
}
