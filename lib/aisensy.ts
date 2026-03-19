// ============================================
// AiSensy WhatsApp client — MOD-07 Notifications
// Separate from lib/whatsapp.ts (OTP-only)
// ============================================

import 'server-only';

const AISENSY_URL =
  'https://backend.aisensy.com/campaign/t1/api/v2';

// ─── Core send function ───────────────────────
interface AiSensyPayload {
  campaignName: string;
  destination: string;      // e.g. "919876543210"
  userName: string;
  templateParams: string[];
  media?: {
    url: string;
    filename: string;
  };
}

export interface AiSensyResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsApp(
  payload: AiSensyPayload
): Promise<AiSensyResult> {
  try {
    const res = await fetch(AISENSY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: process.env.AISENSY_API_KEY,
        campaignName: payload.campaignName,
        destination: payload.destination,
        userName: payload.userName,
        templateParams: payload.templateParams,
        ...(payload.media && { media: payload.media }),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data?.message ?? `HTTP ${res.status}`,
      };
    }

    return {
      success: true,
      messageId: data?.messageId ?? data?.id,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error
        ? err.message
        : 'Unknown error',
    };
  }
}

// ─── Mobile formatter ─────────────────────────
// AiSensy needs: 919876543210 (no + or spaces)
export function formatMobileForWhatsApp(
  mobile: string
): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.startsWith('91') && digits.length === 12) {
    return digits;
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

// ─── Amount formatter ─────────────────────────
export function formatAmountForMessage(
  paise: number
): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

// ─── Date formatter ───────────────────────────
export function formatDateForMessage(
  dateStr: string
): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
