// ============================================
// MOD-07: Notification Service
// All notification calls go through this file.
// Uses lib/aisensy.ts for WhatsApp delivery.
// ============================================

import 'server-only';
import {
  sendWhatsApp,
  formatMobileForWhatsApp,
  formatAmountForMessage,
  formatDateForMessage,
  type AiSensyResult,
} from './aisensy';
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
  result: AiSensyResult;
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
}): Promise<AiSensyResult> {
  // Skip if no mobile
  if (!params.recipientMobile) {
    const result: AiSensyResult = {
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

  const result = await sendWhatsApp({
    campaignName: params.campaignName,
    destination: formatMobileForWhatsApp(params.recipientMobile),
    userName: params.userName,
    templateParams: params.templateParams,
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
// Sends to BOTH photographer AND client (separate templates)
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

  const formattedDate = formatDateForMessage(params.eventDate);
  const formattedAmount = formatAmountForMessage(params.totalAmount);

  // CLIENT template: {{1}}=name, {{2}}=eventType, {{3}}=date, {{4}}=amount, {{5}}=ref
  const clientCampaign = process.env.AISENSY_CAMPAIGN_BOOKING_CONFIRMED_CLIENT
    || process.env.AISENSY_CAMPAIGN_BOOKING_CONFIRMED
    || 'booking_confirmed_client';

  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.clientMobile,
    recipientType: 'CLIENT',
    campaignName: clientCampaign,
    userName: params.clientName,
    templateParams: [
      params.clientName,
      params.eventType,
      formattedDate,
      formattedAmount,
      params.bookingRef,
    ],
  });

  // PHOTOGRAPHER template: {{1}}=clientName, {{2}}=eventType, {{3}}=date, {{4}}=ref
  const photographerCampaign = process.env.AISENSY_CAMPAIGN_BOOKING_CONFIRMED_PHOTOGRAPHER
    || 'booking_confirmed_photographer';

  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.photographerMobile,
    recipientType: 'PHOTOGRAPHER',
    campaignName: photographerCampaign,
    userName: 'Photographer',
    templateParams: [
      params.clientName,
      params.eventType,
      formattedDate,
      params.bookingRef,
    ],
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

  const campaignName = process.env.AISENSY_CAMPAIGN_PAYMENT_RECEIVED || 'payment_received';

  // {{1}}=clientName, {{2}}=amountPaid, {{3}}=balance, {{4}}=receipt, {{5}}=ref
  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.photographerMobile,
    recipientType: 'PHOTOGRAPHER',
    campaignName,
    userName: 'Photographer',
    templateParams: [
      params.clientName,
      formatAmountForMessage(params.amountPaid),
      formatAmountForMessage(params.balanceAmount),
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

  const campaignName = process.env.AISENSY_CAMPAIGN_AGREEMENT_READY || 'agreement_ready';
  const agreementUrl = `${process.env.NEXT_PUBLIC_APP_URL}/agreement/${params.agreementId}`;

  // {{1}}=clientName, {{2}}=studioName, {{3}}=agreementUrl, {{4}}=ref
  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.clientMobile,
    recipientType: 'CLIENT',
    campaignName,
    userName: params.clientName,
    templateParams: [
      params.clientName,
      params.studioName,
      agreementUrl,
      params.bookingRef,
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

  const campaignName = process.env.AISENSY_CAMPAIGN_GALLERY_PUBLISHED || 'gallery_published';
  const galleryUrl = `${process.env.NEXT_PUBLIC_APP_URL}/g/${params.gallerySlug}`;

  // {{1}}=clientName, {{2}}=studioName, {{3}}=photoCount, {{4}}=galleryUrl
  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.clientMobile,
    recipientType: 'CLIENT',
    campaignName,
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

  const campaignName = process.env.AISENSY_CAMPAIGN_PAYMENT_LINK || 'payment_link_sent';
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
    campaignName,
    userName: params.clientName,
    templateParams: [
      params.clientName,
      params.studioName,
      formatAmountForMessage(params.amount),
      params.bookingRef,
      params.paymentUrl,
      expiryDate,
    ],
  });
}

// ─── NOTIFICATION 6: Event Reminder ───────────
// Sends to BOTH photographer AND client (separate templates)
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

  const formattedDate = formatDateForMessage(params.eventDate);
  const venue = params.venueName
    ? `${params.venueName}, ${params.venueCity ?? ''}`
    : params.venueCity ?? 'Venue TBD';

  // CLIENT template: {{1}}=name, {{2}}=eventType, {{3}}=date, {{4}}=venue, {{5}}=balance, {{6}}=ref
  const clientCampaign = process.env.AISENSY_CAMPAIGN_EVENT_REMINDER_CLIENT
    || process.env.AISENSY_CAMPAIGN_EVENT_REMINDER
    || 'event_reminder_client';

  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.clientMobile,
    recipientType: 'CLIENT',
    campaignName: clientCampaign,
    userName: params.clientName,
    templateParams: [
      params.clientName,
      params.eventType,
      formattedDate,
      venue,
      formatAmountForMessage(params.balanceAmount),
      params.bookingRef,
    ],
  });

  // PHOTOGRAPHER template: {{1}}=eventType, {{2}}=clientName, {{3}}=date, {{4}}=venue, {{5}}=ref
  const photographerCampaign = process.env.AISENSY_CAMPAIGN_EVENT_REMINDER_PHOTOGRAPHER
    || 'event_reminder_photographer';

  await sendAndLog({
    studioId: params.studioId,
    bookingId: params.bookingId,
    recipientMobile: params.photographerMobile,
    recipientType: 'PHOTOGRAPHER',
    campaignName: photographerCampaign,
    userName: 'Photographer',
    templateParams: [
      params.eventType,
      params.clientName,
      formattedDate,
      venue,
      params.bookingRef,
    ],
  });
}
