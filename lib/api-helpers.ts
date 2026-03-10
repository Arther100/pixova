// ============================================
// API helper — standard JSON responses
// ============================================

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

type CachePreset = "none" | "short" | "medium" | "long";

const CACHE_HEADERS: Record<CachePreset, Record<string, string>> = {
  none: {},
  short: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" },
  medium: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300" },
  long: { "Cache-Control": "private, max-age=300, stale-while-revalidate=600" },
};

export function successResponse<T>(data: T, status = 200, cache: CachePreset = "none") {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, {
    status,
    headers: CACHE_HEADERS[cache],
  });
}

export function errorResponse(error: string, status = 400) {
  const body: ApiResponse = { success: false, error };
  return NextResponse.json(body, { status });
}

export function unauthorizedResponse(message = "Unauthorized") {
  return errorResponse(message, 401);
}

export function notFoundResponse(message = "Not found") {
  return errorResponse(message, 404);
}

export function serverErrorResponse(message = "Internal server error") {
  return errorResponse(message, 500);
}
