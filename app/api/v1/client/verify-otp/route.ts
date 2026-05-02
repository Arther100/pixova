// ============================================
// POST /api/v1/client/verify-otp
// Auth: PUBLIC
// Verifies OTP, creates account, sets session cookie
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { errorResponse, serverErrorResponse } from '@/lib/api-helpers';
import { verifyClientOTP, createClientAccountSession, getAccountSessionCookieOptions } from '@/lib/clientAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = String(body.phone || '').trim();
    const otp   = String(body.otp   || '').trim();

    if (!phone || !otp) return errorResponse('Phone and OTP are required');

    const result = await verifyClientOTP(phone, otp);

    if (!result.success || !result.account) {
      return errorResponse(result.error || 'Verification failed', 400);
    }

    // Create account session
    const sessionToken = await createClientAccountSession(result.account);
    const cookieOpts = getAccountSessionCookieOptions();

    const redirectTo = '/account';

    const response = NextResponse.json({
      success: true,
      data: {
        account: {
          account_id: result.account.account_id,
          phone: result.account.phone,
          name: result.account.name,
        },
        isNew: result.isNew,
        redirectTo,
      },
    });

    response.cookies.set(cookieOpts.name, sessionToken, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      maxAge: cookieOpts.maxAge,
      path: cookieOpts.path,
    });

    return response;
  } catch (err) {
    console.error('[client/verify-otp] error:', err);
    return serverErrorResponse();
  }
}
