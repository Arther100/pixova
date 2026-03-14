// ============================================
// GET /api/v1/auth/check-slug?slug=some-slug
// Returns slug availability for onboarding form
// ============================================

export const dynamic = 'force-dynamic';

import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/session";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/lib/api-helpers";
import { isSlugAvailable } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // ── Auth check via JWT ──
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    // ── Get slug from query ──
    const slug = request.nextUrl.searchParams.get("slug");

    if (!slug) {
      return errorResponse("Missing slug parameter");
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug) || slug.length < 3 || slug.length > 50) {
      return successResponse({ available: false, reason: "Invalid slug format" });
    }

    // Reserved slugs
    const reserved = [
      "admin",
      "api",
      "login",
      "signup",
      "dashboard",
      "settings",
      "onboarding",
      "help",
      "support",
      "pixova",
      "about",
      "pricing",
      "contact",
      "blog",
      "terms",
      "privacy",
    ];

    if (reserved.includes(slug)) {
      return successResponse({ available: false, reason: "This URL is reserved" });
    }

    const available = await isSlugAvailable(slug);

    return successResponse({ available });
  } catch (err) {
    console.error("[check-slug] error:", err);
    return errorResponse("Failed to check slug", 500);
  }
}
