// ============================================
// Client portal + Marketplace account session helpers
// Portal cookie: pixova_client_session (bookingId/clientId/studioId)
// Account cookie: pixova_account_session (accountId/phone/role)
// ============================================

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createSupabaseAdmin } from '@/lib/supabase';

const CLIENT_SESSION_COOKIE = 'pixova_client_session';
const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET!
);

export interface ClientSessionPayload {
  bookingId: string;
  clientId: string;
  studioId: string;
  portalToken: string;
}

export async function createClientSession(params: ClientSessionPayload): Promise<string> {
  return new SignJWT({ ...params })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET);
}

export async function getClientSession(): Promise<ClientSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      bookingId: payload.bookingId as string,
      clientId: payload.clientId as string,
      studioId: payload.studioId as string,
      portalToken: payload.portalToken as string,
    };
  } catch {
    return null;
  }
}

export function getClientSessionCookieOptions() {
  return {
    name: CLIENT_SESSION_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  };
}

/** Verify a client session token without cookies (for middleware) */
export async function verifyClientToken(token: string): Promise<ClientSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return {
      bookingId: payload.bookingId as string,
      clientId: payload.clientId as string,
      studioId: payload.studioId as string,
      portalToken: payload.portalToken as string,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKETPLACE CLIENT ACCOUNT SESSION
// Separate from portal session. Cookie: pixova_account_session
// ─────────────────────────────────────────────────────────────────────────────

const ACCOUNT_SESSION_COOKIE = 'pixova_account_session';

export interface ClientAccount {
  account_id: string;
  phone: string;
  name: string | null;
  email: string | null;
  city: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface ClientAccountSessionPayload {
  accountId: string;
  phone: string;
  role: 'client';
}

/** Create a signed JWT for a client marketplace account (30-day expiry). */
export async function createClientAccountSession(
  account: ClientAccount
): Promise<string> {
  const token = await new SignJWT({
    accountId: account.account_id,
    phone: account.phone,
    role: 'client',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET);

  // Set cookie
  const cookieStore = cookies();
  cookieStore.set(ACCOUNT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });

  return token;
}

/** Read and verify the pixova_account_session cookie. */
export async function getClientAccountSession(): Promise<ClientAccountSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(ACCOUNT_SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.role !== 'client') return null;
    return {
      accountId: payload.accountId as string,
      phone: payload.phone as string,
      role: 'client',
    };
  } catch {
    return null;
  }
}

/** Verify an account token string without reading cookies (for middleware). */
export async function verifyClientAccountToken(
  token: string
): Promise<ClientAccountSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.role !== 'client') return null;
    return {
      accountId: payload.accountId as string,
      phone: payload.phone as string,
      role: 'client',
    };
  } catch {
    return null;
  }
}

export function getAccountSessionCookieOptions() {
  return {
    name: ACCOUNT_SESSION_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  };
}

/**
 * Send OTP to a client phone for marketplace login.
 * Stores in otp_sessions with role='client'.
 */
export async function sendClientOTP(phone: string): Promise<{ success: boolean; otp?: string; error?: string }> {
  try {
    const { createHash } = await import('crypto');
    const { sendWhatsAppTemplate } = await import('@/lib/whatsapp');

    const supabase = createSupabaseAdmin();

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = createHash('sha256').update(otp + process.env.JWT_SECRET).digest('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Delete old OTPs for this phone+role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('otp_sessions') as any)
      .delete()
      .eq('phone', phone)
      .eq('role', 'client');

    // Insert new OTP
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase.from('otp_sessions') as any).insert({
      phone,
      otp_hash: otpHash,
      channel: 'whatsapp',
      role: 'client',
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error('[clientAuth] sendClientOTP insert error:', insertError);
      return { success: false, error: 'Failed to generate OTP' };
    }

    // Dev bypass: if WhatsApp credentials are not configured, log OTP and succeed
    const hasWhatsApp = !!(process.env.META_PHONE_NUMBER_ID && process.env.META_WHATSAPP_TOKEN);
    if (!hasWhatsApp) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n🔑 [DEV] Client OTP for ${phone}: ${otp}\n`);
        return { success: true, otp };
      }
      return { success: false, error: 'WhatsApp not configured' };
    }

    // Send via WhatsApp
    const result = await sendWhatsAppTemplate({
      to: phone,
      templateName: 'pixova_otp',
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: otp }],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: otp }],
        },
      ],
    });

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to send OTP' };
    }

    return { success: true };
  } catch (err) {
    console.error('[clientAuth] sendClientOTP error:', err);
    return { success: false, error: 'Failed to send OTP' };
  }
}

/**
 * Verify OTP for client marketplace login.
 * If valid, upserts client_accounts and returns the account.
 */
export async function verifyClientOTP(
  phone: string,
  otp: string
): Promise<{ success: boolean; account?: ClientAccount; isNew?: boolean; error?: string }> {
  try {
    const { createHash } = await import('crypto');
    const otpHash = createHash('sha256').update(otp + process.env.JWT_SECRET).digest('hex');

    const supabase = createSupabaseAdmin();

    // Find valid OTP session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error } = await (supabase.from('otp_sessions') as any)
      .select('id, otp_hash, expires_at, verified')
      .eq('phone', phone)
      .eq('role', 'client')
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !session) {
      return { success: false, error: 'OTP expired or not found. Please request a new one.' };
    }

    if (session.otp_hash !== otpHash) {
      return { success: false, error: 'Invalid OTP. Please try again.' };
    }

    // Mark OTP as used
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('otp_sessions') as any)
      .update({ verified: true, verified_at: new Date().toISOString() })
      .eq('id', session.id);

    // Check if account already exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('client_accounts') as any)
      .select('*')
      .eq('phone', phone)
      .single();

    if (existing) {
      // Update last_login_at
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('client_accounts') as any)
        .update({ last_login_at: new Date().toISOString() })
        .eq('account_id', existing.account_id);

      return { success: true, account: existing as ClientAccount, isNew: false };
    }

    // Create new account
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newAccount, error: createError } = await (supabase.from('client_accounts') as any)
      .insert({ phone, last_login_at: new Date().toISOString() })
      .select()
      .single();

    if (createError || !newAccount) {
      return { success: false, error: 'Failed to create account' };
    }

    return { success: true, account: newAccount as ClientAccount, isNew: true };
  } catch (err) {
    console.error('[clientAuth] verifyClientOTP error:', err);
    return { success: false, error: 'Verification failed' };
  }
}

/**
 * When a client opens their portal link, silently create/link their
 * client_accounts row and set the account session cookie.
 */
export async function mergePortalWithAccount(
  bookingClientPhone: string,
  bookingClientName?: string
): Promise<ClientAccount | null> {
  try {
    const supabase = createSupabaseAdmin();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase.from('client_accounts') as any)
      .select('*')
      .eq('phone', bookingClientPhone)
      .single();

    if (existing) {
      await createClientAccountSession(existing as ClientAccount);
      return existing as ClientAccount;
    }

    // Create new account silently
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newAccount, error } = await (supabase.from('client_accounts') as any)
      .insert({
        phone: bookingClientPhone,
        name: bookingClientName || null,
        last_login_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !newAccount) return null;

    await createClientAccountSession(newAccount as ClientAccount);
    return newAccount as ClientAccount;
  } catch (err) {
    console.error('[clientAuth] mergePortalWithAccount error:', err);
    return null;
  }
}

