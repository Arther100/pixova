import 'server-only';

/**
 * Send OTP via MSG91 SMS as fallback when WhatsApp delivery fails.
 * Requires env vars: MSG91_AUTH_KEY, MSG91_TEMPLATE_ID
 */
export async function sendSMSOTP(
  mobile: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;

  if (!authKey || !templateId) {
    console.error('[SMS] MSG91_AUTH_KEY or MSG91_TEMPLATE_ID not set');
    return { success: false, error: 'SMS not configured' };
  }

  // Normalise to digits-only E.164 (strip leading +)
  const digits = mobile.replace(/\D/g, '');

  try {
    const res = await fetch('https://api.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: authKey,
      },
      body: JSON.stringify({
        template_id: templateId,
        mobile: digits,
        otp,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.type === 'error') {
      const errMsg = data?.message ?? `HTTP ${res.status}`;
      console.error('[SMS] MSG91 error:', errMsg);
      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[SMS] Network error:', errMsg);
    return { success: false, error: errMsg };
  }
}
