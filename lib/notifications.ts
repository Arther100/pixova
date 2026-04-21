// ============================================
// MOD-07: Notification Service
// All notification calls go through this file.
// Uses lib/whatsapp.ts for Meta WhatsApp Cloud API.
// ============================================

import 'server-only';
import {
  sendWhatsAppTemplate,
  formatAmount,
  formatDate,
  type WhatsAppResult,
} from './whatsapp';
import { createSupabaseAdmin } from './supabase';

// ─── Types ────────────────────────────────────
type NotificationPreferenceKey =
  | 'notify_booking_confirmed'
  | 'notify_payment_received'
  | 'notify_agreement_ready'
  | 'notify_gallery_published'
  | 'notify_payment_link'
  | 'notify_event_reminder';

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
    console.error('[notifications] Failed to log notification:', err);
  }
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

    // Default TRUE if no preference row exists
    if (!data) return true;
    return (data as Record<string, boolean>)[preferenceKey] !== false;
  } catch {
    // If query fails, default to enabled
    return true;
  }
}

// ─── Helper: send + log in one call ──────────
export async function sendAndLog(params: {
  studioId: string;
  bookingId?: string;
  recipientMobile: string;
  recipientType: 'PHOTOGRAPHER' | 'CLIENT';
  campaignName: string;
  userName: string;
  templateParams: string[];
}): Promise<WhatsAppResult> {
  // Skip if no mobile
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
      campaignName: params.campaignName,
      templateParams: params.templateParams,
      result: { ...result, success: false },
    });
    return result;
  }

  const result = await sendWhatsAppTemplate({
    to: params.recipientMobile,
    templateName: params.campaignName,
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
    campaignName: params.campaignName,
    templateParams: params.templateParams,
    result,
  });

  return result;
}

// ─── NOTIFICATION 1: Booking Confirmed ────────
// Sends to BOTH photographer AND client
export async function notifyBookingConfirmed(params: {
  studioId: string;
  bookingId: string;
  bookingRef: string;
  eventType: string;
  eventDate: string;
  clientName: string;
  clientMobile: string;
  photographerMobile: string;
  totalAmount: number; // paise
}): Promise<void> {
  const enabled = await isEnabled(params.studioId, 'notify_booking_confirmed');
  if (!enabled) return;

  const formattedDate = formatDate(params.eventDate);
  const formattedAmount = formatAmount(params.totalAmount);

  const templateParams = [
    params.clientName,
    params.eventType,
    formattedDate,
    formattedAmount,
    params.bookingRef,
  ];

  // CLIENT
  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.clientMobile,
    recipientType: 'CLIENT',
    campaignName: 'pixova_booking_confirmed',
    userName: params.clientName,
    templateParams,
  });

  // PHOTOGRAPHER
  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.photographerMobile,
    recipientType: 'PHOTOGRAPHER',
    campaignName: 'pixova_booking_confirmed',
    userName: 'Photographer',
    templateParams,
  });
}

// ─── NOTIFICATION 2: Payment Received ─────────
// Sends to PHOTOGRAPHER only
export async function notifyPaymentReceived(params: {
  studioId: string;
  bookingId: string;
  bookingRef: string;
  clientName: string;
  amountPaid: number; // paise
  balanceAmount: number; // paise
  receiptNumber: string;
  photographerMobile: string;
}): Promise<void> {
  const enabled = await isEnabled(params.studioId, 'notify_payment_received');
  if (!enabled) return;

  // {{1}}=clientName, {{2}}=amountPaid, {{3}}=balance, {{4}}=receipt, {{5}}=ref
  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.photographerMobile,
    recipientType: 'PHOTOGRAPHER',
    campaignName: 'pixova_payment_received',
    userName: 'Photographer',
    templateParams: [
      params.clientName,
      formatAmount(params.amountPaid),
      formatAmount(params.balanceAmount),
      params.receiptNumber,
      params.bookingRef,
    ],
  });
}

// ─── NOTIFICATION 3: Agreement Ready ──────────
// Sends to CLIENT with agreement link
export async function notifyAgreementReady(params: {
  studioId: string;
  bookingId: string;
  bookingRef: string;
  clientName: string;
  clientMobile: string;
  studioName: string;
  agreementId: string;
}): Promise<void> {
  const enabled = await isEnabled(params.studioId, 'notify_agreement_ready');
  if (!enabled) return;

  const agreementUrl = `${process.env.NEXT_PUBLIC_APP_URL}/agreement/${params.agreementId}`;

  // {{1}}=clientName, {{2}}=studioName, {{3}}=agreementUrl
  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.clientMobile,
    recipientType: 'CLIENT',
    campaignName: 'pixova_agreement_ready',
    userName: params.clientName,
    templateParams: [
      params.clientName,
      params.studioName,
      agreementUrl,
    ],
  });
}

// ─── NOTIFICATION 4: Gallery Published ────────
// Sends to CLIENT with gallery link
export async function notifyGalleryPublished(params: {
  studioId: string;
  bookingId: string;
  bookingRef: string;
  clientName: string;
  clientMobile: string;
  studioName: string;
  gallerySlug: string;
  photoCount: number;
}): Promise<void> {
  const enabled = await isEnabled(params.studioId, 'notify_gallery_published');
  if (!enabled) return;

  const galleryUrl = `${process.env.NEXT_PUBLIC_APP_URL}/g/${params.gallerySlug}`;

  // {{1}}=clientName, {{2}}=studioName, {{3}}=photoCount, {{4}}=galleryUrl
  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.clientMobile,
    recipientType: 'CLIENT',
    campaignName: 'pixova_gallery_published',
    userName: params.clientName,
    templateParams: [
      params.clientName,
      params.studioName,
      params.photoCount.toString(),
      galleryUrl,
    ],
  });
}

// ─── NOTIFICATION 5: Payment Link Sent ────────
// Sends to CLIENT with Razorpay payment link
export async function notifyPaymentLink(params: {
  studioId: string;
  bookingId: string;
  bookingRef: string;
  clientName: string;
  clientMobile: string;
  studioName: string;
  amount: number; // paise
  paymentUrl: string;
  expiresAt: string; // ISO date
}): Promise<void> {
  const enabled = await isEnabled(params.studioId, 'notify_payment_link');
  if (!enabled) return;

  const expiryDate = new Date(params.expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // {{1}}=clientName, {{2}}=studioName, {{3}}=amount, {{4}}=ref, {{5}}=paymentUrl, {{6}}=expiry
  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.clientMobile,
    recipientType: 'CLIENT',
    campaignName: 'pixova_payment_link',
    userName: params.clientName,
    templateParams: [
      params.clientName,
      params.studioName,
      formatAmount(params.amount),
      params.bookingRef,
      params.paymentUrl,
      expiryDate,
    ],
  });
}

// ─── NOTIFICATION 6: Event Reminder ───────────
// Sends to BOTH photographer AND client
export async function notifyEventReminder(params: {
  studioId: string;
  bookingId: string;
  bookingRef: string;
  eventType: string;
  eventDate: string;
  venueName: string | null;
  venueCity: string | null;
  clientName: string;
  clientMobile: string;
  photographerMobile: string;
  balanceAmount: number; // paise
}): Promise<void> {
  const enabled = await isEnabled(params.studioId, 'notify_event_reminder');
  if (!enabled) return;

  const formattedDate = formatDate(params.eventDate);
  const venue = params.venueName
    ? `${params.venueName}, ${params.venueCity ?? ''}`
    : params.venueCity ?? 'Venue TBD';

  const templateParams = [
    params.clientName,
    params.eventType,
    formattedDate,
    venue,
    formatAmount(params.balanceAmount),
    params.bookingRef,
  ];

  // CLIENT
  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.clientMobile,
    recipientType: 'CLIENT',
    campaignName: 'pixova_event_reminder',
    userName: params.clientName,
    templateParams,
  });

  // PHOTOGRAPHER
  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.photographerMobile,
    recipientType: 'PHOTOGRAPHER',
    campaignName: 'pixova_event_reminder',
    userName: 'Photographer',
    templateParams,
  });
}
