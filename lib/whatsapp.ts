// ============================================
// WhatsApp (AiSensy) OTP delivery
// ============================================

interface SendOtpResult {
  success: boolean;
  channel: "whatsapp" | "sms";
  error?: string;
}

interface AiSensyPayload {
  apiKey: string;
  campaignName: string;
  destination: string;
  userName: string;
  templateParams: string[];
  source?: string;
  media?: Record<string, unknown>;
  buttons?: Array<{ type: string; parameter: string }>;
}

// ---------- AiSensy: Send WhatsApp message ----------
async function sendWhatsApp(
  phone: string,
  campaignName: string,
  templateParams: string[],
  userName = "User"
): Promise<boolean> {
  const payload: AiSensyPayload = {
    apiKey: process.env.AISENSY_API_KEY!,
    campaignName,
    destination: normalizePhone(phone),
    userName,
    templateParams,
  };

  const baseUrl =
    process.env.AISENSY_BASE_URL ||
    "https://backend.aisensy.com/campaign/t1/api/v2";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const res = await fetch(baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const body = await res.text();

    if (!res.ok) {
      console.error("[WhatsApp] AiSensy error:", res.status, body);
      return false;
    }

    console.log("[WhatsApp] Sent successfully:", body);
    return true;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.error("[WhatsApp] Request timed out after 10s");
    } else {
      console.error("[WhatsApp] Network error:", err);
    }
    return false;
  }
}

// ---------- Public: Send OTP via WhatsApp ----------
export async function sendOtp(
  phone: string,
  otp: string,
  userName = "User"
): Promise<SendOtpResult> {
  const whatsappSent = await sendWhatsApp(phone, "otp_verification2", [userName, otp, "10"], userName);

  if (whatsappSent) {
    return { success: true, channel: "whatsapp" };
  }

  return {
    success: false,
    channel: "whatsapp",
    error: "WhatsApp delivery failed",
  };
}

// ---------- Public: Send notification via WhatsApp ----------
export async function sendWhatsAppNotification(
  phone: string,
  campaignName: string,
  templateParams: string[],
  userName = "User"
): Promise<boolean> {
  return sendWhatsApp(phone, campaignName, templateParams, userName);
}

// ---------- Public: Send gallery link ----------
export async function sendGalleryLink(
  phone: string,
  clientName: string,
  studioName: string,
  galleryUrl: string
): Promise<boolean> {
  return sendWhatsApp(phone, "gallery_shared", [
    clientName,
    studioName,
    galleryUrl,
  ], clientName);
}

// ---------- Public: Send booking confirmation ----------
export async function sendBookingConfirmation(
  phone: string,
  clientName: string,
  studioName: string,
  date: string,
  amount: string
): Promise<boolean> {
  return sendWhatsApp(phone, "booking_confirmed", [
    clientName,
    studioName,
    date,
    amount,
  ], clientName);
}

// ---------- Helpers ----------
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
}
