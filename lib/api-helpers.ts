// ============================================
// API helper — standard JSON responses
// ============================================

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export function successResponse<T>(data: T, status = 200) {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, { status });
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
