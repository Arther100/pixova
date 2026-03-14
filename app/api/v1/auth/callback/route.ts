// ============================================
// GET /api/v1/auth/callback
// Exchange a short-lived token for a long-lived JWT session cookie.
//
// Why HTML + document.cookie instead of Set-Cookie on a redirect?
export const dynamic = 'force-dynamic';
// VS Code Simple Browser runs inside an iframe (origin: vscode-webview://).
// Chrome treats Set-Cookie from cross-origin iframe responses as
// third-party cookies and silently drops them — even with SameSite=Lax.
// document.cookie in JS works because the iframe has allow-same-origin.
// This also works perfectly in real browsers outside iframes.
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { verifyExchangeToken, createSessionToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const exchangeToken = url.searchParams.get("token");

  // ── Validate exchange token exists ──
  if (!exchangeToken) {
    console.error("[auth/callback] Missing token param");
    return NextResponse.redirect(new URL("/login?error=missing_token", request.url));
  }

  // ── Verify and decode exchange token (30s TTL) ──
  const payload = await verifyExchangeToken(exchangeToken);

  if (!payload) {
    console.error("[auth/callback] Invalid or expired exchange token");
    return NextResponse.redirect(new URL("/login?error=expired_token", request.url));
  }

  // ── Create long-lived session JWT (7 days) ──
  const sessionToken = await createSessionToken({
    photographerId: payload.photographerId,
    authId: payload.authId,
    phone: payload.phone,
  });

  const redirectTo = payload.redirectTo || "/dashboard";
  const maxAge = 60 * 60 * 24 * 7; // 7 days

  console.log(
    `[auth/callback] ✅ Session created for ${payload.phone} → ${redirectTo}`
  );

  // ── Return HTML page that sets cookie via JS, then navigates ──
  // This bypasses all iframe / third-party cookie restrictions.
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Signing in…</title></head>
<body>
<p style="font-family:system-ui;text-align:center;margin-top:40vh;color:#888">
  Signing in…
</p>
<script>
document.cookie="pixova_session=${sessionToken};path=/;max-age=${maxAge};samesite=lax";
window.location.replace("${redirectTo}");
</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
