// ============================================
// Client portal JWT session helpers
// Separate from photographer session (lib/session.ts)
// Cookie: pixova_client_session
// ============================================

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

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
