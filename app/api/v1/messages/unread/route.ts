export const dynamic = 'force-dynamic';

import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';

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

    if (!studio) return successResponse({ unread_count: 0 });

    const { count } = await supabase
      .from('client_messages')
      .select('message_id', { count: 'exact', head: true })
      .eq('studio_id', studio.id)
      .eq('is_read', false);

    return successResponse({ unread_count: count || 0 });
  } catch (err) {
    console.error('[messages] unread error:', err);
    return serverErrorResponse();
  }
}
