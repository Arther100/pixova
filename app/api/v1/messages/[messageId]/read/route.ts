export const dynamic = 'force-dynamic';

import {
  successResponse,
  notFoundResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-helpers';
import { createSupabaseAdmin } from '@/lib/supabase';
import { getSessionFromCookie } from '@/lib/session';
import type { ClientMessage } from '@/types/database';

export async function PATCH(
  _request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();

    // Verify message belongs to photographer's studio
    const { data: studio } = await supabase
      .from('studio_profiles')
      .select('id')
      .eq('photographer_id', session.photographerId)
      .single();

    if (!studio) return notFoundResponse();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: message } = await (supabase.from('client_messages') as any)
      .select('message_id, studio_id')
      .eq('message_id', params.messageId)
      .single() as { data: Pick<ClientMessage, 'message_id' | 'studio_id'> | null; error: unknown };

    if (!message || message.studio_id !== studio.id) {
      return notFoundResponse('Message not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('client_messages') as any)
      .update({ is_read: true })
      .eq('message_id', params.messageId);

    return successResponse({ success: true });
  } catch (err) {
    console.error('[messages] read error:', err);
    return serverErrorResponse();
  }
}
