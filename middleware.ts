import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Routes that require authentication
const protectedPaths = [
  "/dashboard",
  "/bookings",
  "/galleries",
  "/clients",
  "/payments",
  "/messages",
  "/reviews",
  "/settings",
  "/onboarding",
];

// Routes that require completed onboarding
const onboardedOnlyPaths = [
  "/dashboard",
  "/bookings",
  "/galleries",
  "/clients",
  "/payments",
  "/messages",
  "/reviews",
  "/settings",
];

// Subscription bypass routes (allowed even when expired/suspended)
const subscriptionBypassPaths = [
  "/settings/subscription",
  "/suspended",
  "/onboarding",
];

// Admin-only paths
const adminPaths = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and API routes (API routes handle their own auth)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ── Admin routes ──
  if (adminPaths.some((p) => pathname.startsWith(p))) {
    // Allow admin login page without auth
    if (pathname === "/admin/login") return NextResponse.next();

    const adminToken = request.cookies.get("pixova_admin_session")?.value;
    if (!adminToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      const { payload } = await jwtVerify(adminToken, secret);
      if (payload.role !== "admin") throw new Error("Not admin");
    } catch {
      const response = NextResponse.redirect(new URL("/admin/login", request.url));
      response.cookies.delete("pixova_admin_session");
      return response;
    }
    return NextResponse.next();
  }

  // ── Client portal routes — separate auth flow ──
  // Portal uses pixova_client_session cookie (set by portal entry API)
  if (pathname.startsWith("/portal/")) {
    const clientToken = request.cookies.get("pixova_client_session")?.value;
    if (!clientToken) {
      // No session — allow through (entry page handles auth via API)
      return NextResponse.next();
    }
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      await jwtVerify(clientToken, secret);
      return NextResponse.next();
    } catch {
      // Expired/invalid client session — clear cookie, allow through for re-auth
      const response = NextResponse.next();
      response.cookies.delete("pixova_client_session");
      return response;
    }
  }

  // ── Verify JWT session ──
  // Read token from cookie first, fall back to URL param (_pxtoken).
  // The URL fallback is needed because VS Code Simple Browser (iframe)
  // silently drops ALL cookies — Set-Cookie headers AND document.cookie.
  // In production (real browsers), the cookie path works normally.
  const tokenFromCookie = request.cookies.get("pixova_session")?.value;
  const tokenFromUrl = request.nextUrl.searchParams.get("_pxtoken");
  const token = tokenFromCookie || tokenFromUrl || null;
  let isAuthenticated = false;
  let photographerId: string | null = null;

  if (token) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
      const { payload } = await jwtVerify(token, secret);
      isAuthenticated = true;
      photographerId = (payload.photographerId as string) ?? null;
    } catch {
      // Invalid or expired token — treat as guest, clear bad cookie
      const response = NextResponse.next();
      response.cookies.delete("pixova_session");
      response.cookies.delete("pixova_onboarded");

      const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
      if (isProtected) {
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }

      return response;
    }
  }

  // ── Helper: build redirect URL, carrying _pxtoken if cookies aren't working ──
  const makeRedirectUrl = (path: string): URL => {
    const url = new URL(path, request.url);
    if (!tokenFromCookie && token) {
      url.searchParams.set("_pxtoken", token);
    }
    return url;
  };

  // ── Helper: attach session cookie to response (best-effort) ──
  const trySetCookie = (response: NextResponse): NextResponse => {
    if (token && !tokenFromCookie) {
      response.cookies.set("pixova_session", token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }
    return response;
  };

  // Check if path is protected
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Redirect guests away from landing page ──
  if (!isAuthenticated && pathname === "/") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Onboarding redirect logic ──
  if (isAuthenticated && photographerId) {
    // Redirect logged-in users away from /login and / (root)
    if (pathname === "/login" || pathname === "/") {
      return trySetCookie(NextResponse.redirect(makeRedirectUrl("/dashboard")));
    }

    // ── Subscription status check ──
    const isSubscriptionBypass = subscriptionBypassPaths.some((p) => pathname.startsWith(p));
    const needsSubscriptionCheck = !isSubscriptionBypass &&
      onboardedOnlyPaths.some((p) => pathname.startsWith(p));

    if (needsSubscriptionCheck) {
      const { createSupabaseAdmin } = await import("@/lib/supabase");
      const supabase = createSupabaseAdmin();

      const { data: photographer } = await supabase
        .from("photographers")
        .select("is_suspended")
        .eq("id", photographerId)
        .single();

      if (photographer?.is_suspended) {
        return trySetCookie(NextResponse.redirect(makeRedirectUrl("/suspended")));
      }

      const { data: sub } = await supabase
        .from("subscriptions")
        .select("status, current_period_end, grace_period_ends_at")
        .eq("photographer_id", photographerId)
        .single();

      if (sub) {
        const now = new Date();
        const status = (sub.status as string).toUpperCase();
        const periodEnd = new Date(sub.current_period_end);
        const graceEnd = sub.grace_period_ends_at ? new Date(sub.grace_period_ends_at) : null;

        const isAllowed =
          status === "ACTIVE" ||
          status === "CANCELLED" || // still access until period end
          (status === "TRIAL" || status === "TRIALING") && now < periodEnd ||
          (status === "GRACE" && graceEnd && now < graceEnd);

        if (!isAllowed) {
          return trySetCookie(NextResponse.redirect(makeRedirectUrl("/settings/subscription")));
        }
      }
    }

    // Check if route requires completed onboarding
    const needsOnboarding = onboardedOnlyPaths.some((p) =>
      pathname.startsWith(p)
    );

    if (needsOnboarding || pathname === "/onboarding") {
      // Use a lightweight cookie-cached approach to avoid DB hit on every request
      const onboardedCookie = request.cookies.get("pixova_onboarded");

      if (!onboardedCookie) {
        // First visit after login — check DB and set cookie
        const { createSupabaseAdmin } = await import("@/lib/supabase");
        const supabase = createSupabaseAdmin();

        const { data: photographer } = await supabase
          .from("photographers")
          .select("is_onboarded")
          .eq("id", photographerId)
          .single();

        const isOnboarded = photographer?.is_onboarded ?? false;

        // Build response with the onboarded cache cookie
        const redirectUrl = needsOnboarding && !isOnboarded
          ? makeRedirectUrl("/onboarding")
          : pathname === "/onboarding" && isOnboarded
            ? makeRedirectUrl("/dashboard")
            : null;

        const response = redirectUrl
          ? NextResponse.redirect(redirectUrl)
          : NextResponse.next();

        response.cookies.set("pixova_onboarded", isOnboarded ? "1" : "0", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60,
          path: "/",
        });

        return trySetCookie(response);
      } else {
        const isOnboarded = onboardedCookie.value === "1";

        if (needsOnboarding && !isOnboarded) {
          return trySetCookie(NextResponse.redirect(makeRedirectUrl("/onboarding")));
        }

        if (pathname === "/onboarding" && isOnboarded) {
          return trySetCookie(NextResponse.redirect(makeRedirectUrl("/dashboard")));
        }
      }
    }
  }

  return trySetCookie(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
