// ============================================
// GET /api/v1/bookings/summary — Booking summary cards data
// ============================================

export const dynamic = 'force-dynamic';

import { getSessionFromCookie } from "@/lib/session";
import { createSupabaseAdmin } from "@/lib/supabase";
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-helpers";

export async function GET() {
  try {
    const session = await getSessionFromCookie();
    if (!session) return unauthorizedResponse();

    const supabase = createSupabaseAdmin();
    const photographerId = session.photographerId;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const today = now.toISOString().split("T")[0];
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Run all 4 queries in parallel
    const [totalRes, revenueRes, balanceRes, upcomingRes] = await Promise.all([
      // Total bookings this month (non-cancelled)
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("photographer_id", photographerId)
        .gte("created_at", monthStart)
        .neq("status", "cancelled"),

      // Revenue this month (sum of total_amount for non-cancelled)
      supabase
        .from("bookings")
        .select("total_amount")
        .eq("photographer_id", photographerId)
        .gte("created_at", monthStart)
        .neq("status", "cancelled"),

      // Pending balance (sum of balance_amount for active bookings)
      supabase
        .from("bookings")
        .select("balance_amount")
        .eq("photographer_id", photographerId)
        .neq("status", "cancelled")
        .neq("status", "completed")
        .gt("balance_amount", 0),

      // Upcoming events this week
      supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("photographer_id", photographerId)
        .gte("event_date", today)
        .lte("event_date", weekEnd)
        .neq("status", "cancelled"),
    ]);

    const revenueThisMonth = (revenueRes.data ?? []).reduce(
      (sum, b) => sum + (b.total_amount ?? 0),
      0
    );

    const pendingBalance = (balanceRes.data ?? []).reduce(
      (sum, b) => sum + (b.balance_amount ?? 0),
      0
    );

    return successResponse({
      totalThisMonth: totalRes.count ?? 0,
      revenueThisMonth,
      pendingBalance,
      upcomingThisWeek: upcomingRes.count ?? 0,
    }, 200, "short");
  } catch (err) {
    console.error("[GET /bookings/summary] Unexpected error:", err);
    return serverErrorResponse();
  }
}
