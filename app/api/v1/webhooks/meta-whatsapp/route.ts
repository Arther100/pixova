export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

// ─── GET: Webhook verification ────────────────
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (
    mode === 'subscribe' &&
    token === process.env.META_WEBHOOK_VERIFY_TOKEN
  ) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

// ─── POST: Delivery status updates ────────────
const STATUS_MAP: Record<string, string> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  read: 'READ',
  failed: 'FAILED',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const statuses =
      body?.entry?.[0]?.changes?.[0]?.value?.statuses;

    if (Array.isArray(statuses) && statuses.length > 0) {
      const supabase = createSupabaseAdmin();

      for (const status of statuses) {
        const messageId = status?.id;
        const rawStatus = status?.status;
        const mappedStatus = STATUS_MAP[rawStatus];

        if (messageId && mappedStatus) {
          await supabase
            .from('whatsapp_notifications')
            .update({ status: mappedStatus })
            .eq('aisensy_message_id', messageId);
        }
      }
    }
  } catch (err) {
    console.error('[meta-whatsapp-webhook] Error processing:', err);
  }

  // Always return 200 — Meta retries on non-200
  return new Response('OK', { status: 200 });
}
