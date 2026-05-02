// ============================================
// POST /api/v1/client/send-otp
// Auth: PUBLIC
// Sends OTP to client phone via WhatsApp
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-helpers';
import { sendClientOTP } from '@/lib/clientAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = String(body.phone || '').trim();

    if (!phone || !/^\+?[0-9]{10,15}$/.test(phone.replace(/\s/g, ''))) {
      return errorResponse('Invalid phone number');
    }

    const result = await sendClientOTP(phone);

    if (!result.success) {
      return errorResponse(result.error || 'Failed to send OTP', 500);
    }

    return successResponse({
      message: 'OTP sent via WhatsApp',
      channel: 'whatsapp',
      // In dev, expose OTP so it can be seen without WhatsApp
      ...(process.env.NODE_ENV !== 'production' && (result as { otp?: string }).otp
        ? { dev_otp: (result as { otp?: string }).otp }
        : {}),
    });
  } catch (err) {
    console.error('[client/send-otp] error:', err);
    return serverErrorResponse();
  }
}
