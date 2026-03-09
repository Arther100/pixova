// ============================================
// JWT session helpers — read pixova_session cookie
// ============================================

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

export interface JwtSessionPayload {
  photographerId: string;
  authId: string;
  phone: string;
}

/**
 * Read and verify the pixova_session JWT from cookies.
 * Returns the payload if valid, null otherwise.
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function getSessionFromCookie(): Promise<JwtSessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get("pixova_session")?.value;

  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    return {
      photographerId: payload.photographerId as string,
      authId: payload.authId as string,
      phone: payload.phone as string,
    };
  } catch {
    return null;
  }
}

/**
 * Create a signed JWT session token (7-day expiry).
 * Used by the callback route to set the long-lived session cookie.
 */
export async function createSessionToken(payload: JwtSessionPayload): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

  return new SignJWT({
    photographerId: payload.photographerId,
    authId: payload.authId,
    phone: payload.phone,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Create a short-lived exchange token (30 seconds).
 * Used by verify-otp to pass session info to the callback route
 * via a URL parameter, not a cookie.
 */
export async function createExchangeToken(
  payload: JwtSessionPayload & { sessionId: string; redirectTo: string }
): Promise<string> {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

  return new SignJWT({
    photographerId: payload.photographerId,
    authId: payload.authId,
    phone: payload.phone,
    sessionId: payload.sessionId,
    redirectTo: payload.redirectTo,
    purpose: "exchange", // distinguish from session tokens
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30s")
    .sign(secret);
}

/**
 * Verify and decode an exchange token.
 * Returns null if expired, invalid, or wrong purpose.
 */
export async function verifyExchangeToken(
  token: string
): Promise<(JwtSessionPayload & { sessionId: string; redirectTo: string }) | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, secret);

    // Must be an exchange token, not a session token
    if (payload.purpose !== "exchange") return null;

    return {
      photographerId: payload.photographerId as string,
      authId: payload.authId as string,
      phone: payload.phone as string,
      sessionId: payload.sessionId as string,
      redirectTo: payload.redirectTo as string,
    };
  } catch {
    return null;
  }
}
