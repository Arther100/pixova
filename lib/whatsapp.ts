// ============================================
// Meta WhatsApp Cloud API — Direct Integration
// Replaces AiSensy with Meta Graph API v19.0
// ============================================

import 'server-only';
import { createSupabaseAdmin } from './supabase';

const META_API = 'https://graph.facebook.com/v19.0';

// ─── Types ────────────────────────────────────
export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface TemplateComponent {
  type: string;
  parameters: Array<{ type: string; text: string }>;
}

type NotificationPreferenceKey =
  | 'notify_booking_confirmed'
  | 'notify_payment_received'
  | 'notify_agreement_ready'
  | 'notify_gallery_published'
  | 'notify_payment_link'
  | 'notify_event_reminder';

// ─── Core send function ──────────────────────
export async function sendWhatsAppTemplate(params: {
  to: string;
  templateName: string;
  components: TemplateComponent[];
}): Promise<WhatsAppResult> {
  try {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    const token = process.env.META_WHATSAPP_TOKEN;

    if (!phoneNumberId || !token) {
      return { success: false, error: 'Missing META_PHONE_NUMBER_ID or META_WHATSAPP_TOKEN' };
    }

    const res = await fetch(`${META_API}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formatMobile(params.to),
        type: 'template',
        template: {
          name: params.templateName,
          language: { code: 'en_US' },
          components: params.components,
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message ?? `HTTP ${res.status}`;
      console.error('[WhatsApp] Meta API error:', errMsg);
      return { success: false, error: errMsg };
    }

    const messageId = data?.messages?.[0]?.id ?? undefined;
    return { success: true, messageId };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[WhatsApp] Network error:', errMsg);
    return { success: false, error: errMsg };
  }
}

// ─── Mobile formatter ─────────────────────────
export function formatMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  return digits;
}

// ─── Amount formatter ─────────────────────────
export function formatAmount(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

// ─── Date formatter ───────────────────────────
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Check notification preference ───────────
async function isEnabled(
  studioId: string,
  preferenceKey: NotificationPreferenceKey
): Promise<boolean> {
  try {
    const supabase = createSupabaseAdmin();
    const { data } = await supabase
      .from('notification_preferences')
      .select(preferenceKey)
      .eq('studio_id', studioId)
      .single();

    if (!data) return true;
    return (data as Record<string, boolean>)[preferenceKey] !== false;
  } catch {
    return true;
  }
}

// ─── Log notification to DB ───────────────────
async function logNotification(params: {
  studioId: string;
  bookingId?: string;
  recipientMobile: string;
  recipientType: 'PHOTOGRAPHER' | 'CLIENT';
  campaignName: string;
  templateParams: string[];
  result: WhatsAppResult;
}): Promise<void> {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from('whatsapp_notifications').insert({
      studio_id: params.studioId,
      booking_id: params.bookingId || null,
      recipient_mobile: params.recipientMobile,
      recipient_type: params.recipientType,
      campaign_name: params.campaignName,
      template_params: params.templateParams,
      status: params.result.success ? 'SENT' : 'FAILED',
      aisensy_message_id: params.result.messageId || null,
      error_message: params.result.error || null,
      sent_at: params.result.success ? new Date().toISOString() : null,
    });
  } catch (err) {
    console.error('[whatsapp] Failed to log notification:', err);
  }
}

// ─── Helper: send + log ──────────────────────
async function sendAndLog(params: {
  studioId: string;
  bookingId?: string;
  recipientMobile: string;
  recipientType: 'PHOTOGRAPHER' | 'CLIENT';
  templateName: string;
  templateParams: string[];
}): Promise<WhatsAppResult> {
  if (!params.recipientMobile) {
    const result: WhatsAppResult = {
      success: false,
      error: `No ${params.recipientType.toLowerCase()} mobile set`,
    };
    await logNotification({
      studioId: params.studioId,
      bookingId: params.bookingId,
      recipientMobile: 'unknown',
      recipientType: params.recipientType,
      campaignName: params.templateName,
      templateParams: params.templateParams,
      result,
    });
    return result;
  }

  const result = await sendWhatsAppTemplate({
    to: params.recipientMobile,
    templateName: params.templateName,
    components: [
      {
        type: 'body',
        parameters: params.templateParams.map((text) => ({ type: 'text', text })),
      },
    ],
  });

  await logNotification({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.recipientMobile,
    recipientType: params.recipientType,
    campaignName: params.templateName,
    templateParams: params.templateParams,
    result,
  });

  return result;
}

// ═══════════════════════════════════════════════
// OTP
// ═══════════════════════════════════════════════

interface SendOtpResult {
  success: boolean;
  channel: 'whatsapp' | 'sms';
  error?: string;
}

export async function sendOtp(
  mobile: string,
  otp: string
): Promise<SendOtpResult> {
  const result = await sendWhatsAppTemplate({
    to: mobile,
    templateName: 'pixova_otp',
    components: [
      {
        type: 'body',
        parameters: [{ type: 'text', text: otp }],
      },
    ],
  });

  if (result.success) {
    return { success: true, channel: 'whatsapp' };
  }

  return {
    success: false,
    channel: 'whatsapp',
    error: result.error ?? 'WhatsApp delivery failed',
  };
}

// ═══════════════════════════════════════════════
// NOTIFICATION 1: Booking Confirmed
// ═══════════════════════════════════════════════

export async function notifyBookingConfirmed(params: {
  clientMobile: string;
  photographerMobile: string;
  clientName: string;
  studioName: string;
  eventType: string;
  eventDate: string;
  totalAmount: number;
  bookingRef: string;
  studioId: string;
  bookingId: string;
}): Promise<void> {
  try {
    const enabled = await isEnabled(params.studioId, 'notify_booking_confirmed');
    if (!enabled) return;

    const templateParams = [
      params.clientName,
      params.studioName,
      params.eventType,
      formatDate(params.eventDate),
      formatAmount(params.totalAmount),
      params.bookingRef,
    ];

    await sendAndLog({
      studioId: params.studioId,
      bookingId: params.bookingId,
      recipientMobile: params.clientMobile,
      recipientType: 'CLIENT',
      templateName: 'pixova_booking_confirmed',
      templateParams,
    });

    await sendAndLog({
      studioId: params.studioId,
      bookingId: params.bookingId,
      recipientMobile: params.photographerMobile,
      recipientType: 'PHOTOGRAPHER',
      templateName: 'pixova_booking_confirmed',
      templateParams,
    });
  } catch (err) {
    console.error('[whatsapp] notifyBookingConfirmed error:', err);
  }
}

// ═══════════════════════════════════════════════
// NOTIFICATION 2: Payment Received
// ═══════════════════════════════════════════════

export async function notifyPaymentReceived(params: {
  photographerMobile: string;
  clientName: string;
  amountPaid: number;
  balanceAmount: number;
  receiptNumber: string;
  bookingRef: string;
  studioId: string;
  bookingId: string;
}): Promise<void> {
  try {
    const enabled = await isEnabled(params.studioId, 'notify_payment_received');
    if (!enabled) return;

    await sendAndLog({
      studioId: params.studioId,
      bookingId: params.bookingId,
      recipientMobile: params.photographerMobile,
      recipientType: 'PHOTOGRAPHER',
      templateName: 'pixova_payment_received',
      templateParams: [
        params.clientName,
        formatAmount(params.amountPaid),
        formatAmount(params.balanceAmount),
        params.receiptNumber,
        params.bookingRef,
      ],
    });
  } catch (err) {
    console.error('[whatsapp] notifyPaymentReceived error:', err);
  }
}

// ═══════════════════════════════════════════════
// NOTIFICATION 3: Agreement Ready
// ═══════════════════════════════════════════════

export async function notifyAgreementReady(params: {
  clientMobile: string;
  clientName: string;
  studioName: string;
  agreementId: string;
  studioId: string;
  bookingId: string;
}): Promise<void> {
  try {
    const enabled = await isEnabled(params.studioId, 'notify_agreement_ready');
    if (!enabled) return;

    const agreementUrl = `${process.env.NEXT_PUBLIC_APP_URL}/agreement/${params.agreementId}`;

    await sendAndLog({
      studioId: params.studioId,
      bookingId: params.bookingId,
      recipientMobile: params.clientMobile,
      recipientType: 'CLIENT',
      templateName: 'pixova_agreement_ready',
      templateParams: [
        params.clientName,
        params.studioName,
        agreementUrl,
      ],
    });
  } catch (err) {
    console.error('[whatsapp] notifyAgreementReady error:', err);
  }
}

// ═══════════════════════════════════════════════
// NOTIFICATION 4: Gallery Published
// ═══════════════════════════════════════════════

export async function notifyGalleryPublished(params: {
  clientMobile: string;
  clientName: string;
  studioName: string;
  gallerySlug: string;
  photoCount: number;
  studioId: string;
  bookingId: string;
}): Promise<void> {
  try {
    const enabled = await isEnabled(params.studioId, 'notify_gallery_published');
    if (!enabled) return;

    const galleryUrl = `${process.env.NEXT_PUBLIC_APP_URL}/g/${params.gallerySlug}`;

    await sendAndLog({
      studioId: params.studioId,
      bookingId: params.bookingId,
      recipientMobile: params.clientMobile,
      recipientType: 'CLIENT',
      templateName: 'pixova_gallery_published',
      templateParams: [
        params.clientName,
        params.studioName,
        params.photoCount.toString(),
        galleryUrl,
      ],
    });
  } catch (err) {
    console.error('[whatsapp] notifyGalleryPublished error:', err);
  }
}

// ═══════════════════════════════════════════════
// NOTIFICATION 5: Payment Link
// ═══════════════════════════════════════════════

export async function notifyPaymentLink(params: {
  clientMobile: string;
  clientName: string;
  studioName: string;
  amount: number;
  bookingRef: string;
  paymentUrl: string;
  expiresAt: string;
  studioId: string;
  bookingId: string;
}): Promise<void> {
  try {
    const enabled = await isEnabled(params.studioId, 'notify_payment_link');
    if (!enabled) return;

    const expiryDate = new Date(params.expiresAt).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    await sendAndLog({
      studioId: params.studioId,
      bookingId: params.bookingId,
      recipientMobile: params.clientMobile,
      recipientType: 'CLIENT',
      templateName: 'pixova_payment_link',
      templateParams: [
        params.clientName,
        params.studioName,
        formatAmount(params.amount),
        params.bookingRef,
        params.paymentUrl,
        expiryDate,
      ],
    });
  } catch (err) {
    console.error('[whatsapp] notifyPaymentLink error:', err);
  }
}

// ═══════════════════════════════════════════════
// NOTIFICATION 6: Event Reminder
// ═══════════════════════════════════════════════

export async function notifyEventReminder(params: {
  clientMobile: string;
  photographerMobile: string;
  clientName: string;
  eventType: string;
  eventDate: string;
  venue: string;
  bookingRef: string;
  balanceAmount: number;
  studioId: string;
  bookingId: string;
}): Promise<void> {
  try {
    const enabled = await isEnabled(params.studioId, 'notify_event_reminder');
    if (!enabled) return;

    const templateParams = [
      params.clientName,
      params.eventType,
      formatDate(params.eventDate),
      params.venue,
      params.bookingRef,
      formatAmount(params.balanceAmount),
    ];

    await sendAndLog({
      studioId: params.studioId,
      bookingId: params.bookingId,
      recipientMobile: params.clientMobile,
      recipientType: 'CLIENT',
      templateName: 'pixova_event_reminder',
      templateParams,
    });

    await sendAndLog({
      studioId: params.studioId,
      bookingId: params.bookingId,
      recipientMobile: params.photographerMobile,
      recipientType: 'PHOTOGRAPHER',
      templateName: 'pixova_event_reminder',
      templateParams,
    });
  } catch (err) {
    console.error('[whatsapp] notifyEventReminder error:', err);
  }
}
