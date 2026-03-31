// ============================================
// Admin Auth — MOD-09
// Separate from photographer auth.
// Cookie: pixova_admin_session (httpOnly, 8h)
// ============================================

import 'server-only';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { createSupabaseAdmin } from '@/lib/supabase';

const ADMIN_COOKIE = 'pixova_admin_session';
const ADMIN_SESSION_HOURS = 8;

export interface AdminJwtPayload {
  adminId: string;
  email: string;
}

// ─── Verify password against admin_users table ───
export async function verifyAdminPassword(
  email: string,
  password: string
): Promise<{ adminId: string; name: string } | null> {
  const supabase = createSupabaseAdmin();

  const { data: admin } = await supabase
    .from('admin_users')
    .select('admin_id, password_hash, name, is_active')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (!admin || !admin.is_active) return null;

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return null;

  // Update last_login_at
  await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('admin_id', admin.admin_id);

  return { adminId: admin.admin_id, name: admin.name };
}

// ─── Create signed admin JWT ────────────────────
export async function createAdminSession(
  adminId: string,
  email: string
): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

  return new SignJWT({ adminId, email, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_HOURS}h`)
    .sign(secret);
}

// ─── Read & verify admin session cookie ─────────
export async function getAdminSession(): Promise<AdminJwtPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    if (payload.role !== 'admin') return null;

    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

// ─── Verify admin JWT from raw token value ──────
export async function verifyAdminToken(
  token: string
): Promise<AdminJwtPayload | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== 'admin') return null;
    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

// ─── Set admin session cookie ────────────────────
export function setAdminCookie(token: string): void {
  const cookieStore = cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ADMIN_SESSION_HOURS * 60 * 60,
    path: '/',
  });
}

// ─── Clear admin session cookie ─────────────────
export function clearAdminCookie(): void {
  const cookieStore = cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

// ─── Log subscription event ─────────────────────
export async function logSubscriptionEvent(params: {
  photographerId: string;
  studioId?: string;
  eventType: string;
  oldPlan?: string;
  newPlan?: string;
  oldStatus?: string;
  newStatus?: string;
  amountPaise?: number;
  razorpaySubId?: string;
  notes?: string;
  performedBy?: string;
}): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from('subscription_events').insert({
    photographer_id: params.photographerId,
    studio_id: params.studioId || null,
    event_type: params.eventType,
    old_plan: params.oldPlan || null,
    new_plan: params.newPlan || null,
    old_status: params.oldStatus || null,
    new_status: params.newStatus || null,
    amount_paise: params.amountPaise || null,
    razorpay_sub_id: params.razorpaySubId || null,
    notes: params.notes || null,
    performed_by: params.performedBy || 'SYSTEM',
  });
}
